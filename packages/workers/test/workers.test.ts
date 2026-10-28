import { expect, test, vi } from "vitest";
import { createSearchEngine } from "@searchivo/core";
import { createCancellation } from "@searchivo/core/source";
import { createWorkerClient } from "../src/client.js";
import { attachWorkerRuntime } from "../src/runtime.js";
import { validRequest, validResult, record } from "../src/protocol.js";
import type { Transport } from "../src/protocol.js";
import { webTransport } from "../src/web.js";
type Doc = { id: number; text: string };
const isDoc = (value: unknown): value is Doc =>
  record(value) &&
  typeof value.id === "number" &&
  typeof value.text === "string";
function port() {
  const messages = new Set<(value: unknown) => void>(),
    errors = new Set<(error: Error) => void>();
  const sent: unknown[] = [];
  const transport: Transport = {
    send(value) {
      sent.push(value);
    },
    onMessage(listener) {
      messages.add(listener);
      return () => {
        messages.delete(listener);
      };
    },
    onError(listener) {
      errors.add(listener);
      return () => {
        errors.delete(listener);
      };
    },
    terminate: vi.fn(),
  };
  return {
    transport,
    sent,
    messages,
    errors,
    emit(value: unknown) {
      for (const listener of [...messages]) listener(value);
    },
    error() {
      for (const listener of [...errors]) listener(new Error("crashed"));
    },
  };
}
test("loopback validates and executes readiness, indexing, mutations, search, suggestions and disposal", async () => {
  const a = port(),
    b = port();
  a.transport.send = (value) => b.emit(structuredClone(value));
  b.transport.send = (value) => a.emit(structuredClone(value));
  const engine = createSearchEngine<Doc>({ id: "id", fields: { text: {} } });
  const detach = attachWorkerRuntime(b.transport, engine, isDoc),
    client = createWorkerClient(a.transport, isDoc);
  expect(await client.request("ready", null)).toBe(true);
  await client.request("add", [{ id: 1, text: "phone" }]);
  expect((await client.request("search", "phone"))[0]?.id).toBe(1);
  expect(await client.request("suggest", { query: "ph", limit: 5 })).toEqual([
    "phone",
  ]);
  await client.request("upsert", [{ id: 1, text: "pixel" }]);
  await expect(
    client.request("add", [{ id: 1, text: "duplicate" }]),
  ).rejects.toThrow("duplicate");
  expect(await client.request("remove", 1)).toBe(true);
  expect(await client.request("remove", "missing")).toBe(false);
  await client.request("clear", null);
  await client.request("dispose", null);
  await expect(client.request("ready", null)).rejects.toThrow(
    "runtime disposed",
  );
  detach();
  client.dispose();
  expect(a.messages.size + a.errors.size + b.messages.size).toBe(0);
});
test("validates unknown request shapes and every response type", () => {
  const request = (operation: string, payload: unknown) => ({
    version: 1,
    id: 1,
    operation,
    payload,
  });
  for (const value of [
    null,
    [],
    {},
    { version: 2, id: 1 },
    { version: 1, id: 0 },
    { version: 1, id: 1.5 },
    request("unknown", null),
    request("add", {}),
    request("add", [false]),
    request("search", 3),
    request("suggest", null),
    request("suggest", { query: 1 }),
    request("suggest", { query: "a", limit: -1 }),
    request("suggest", { query: "a", limit: 1001 }),
    request("clear", 1),
    request("remove", ""),
    request("remove", Infinity),
  ])
    expect(validRequest(value, isDoc)).toBe(false);
  expect(validRequest(request("remove", "id"), isDoc)).toBe(true);
  expect(validResult("ready", false, isDoc)).toBe(false);
  expect(validResult("remove", 1, isDoc)).toBe(false);
  expect(validResult("suggest", ["a"], isDoc)).toBe(true);
  expect(validResult("suggest", [3], isDoc)).toBe(false);
  expect(validResult("suggest", {}, isDoc)).toBe(false);
  for (const value of [
    {},
    [null],
    [{ id: "", score: 1, document: {} }],
    [{ id: 1, score: "1", document: {} }],
    [{ id: 1, score: Infinity, document: {} }],
    [{ id: 1, score: -1, document: {} }],
    [{ id: 1, score: 1, document: false }],
  ])
    expect(validResult("search", value, isDoc)).toBe(false);
});
test("client abort cleans pending state and ignores late and unknown IDs", async () => {
  const p = port(),
    client = createWorkerClient(p.transport, isDoc),
    abort = createCancellation();
  const pending = client.request("ready", null, abort.signal);
  abort.abort();
  await expect(pending).rejects.toThrow("cancelled");
  p.emit({ version: 1, id: 1, ok: true, value: true });
  p.emit({ version: 1, id: 99, ok: true, value: true });
  await expect(client.request("ready", null, abort.signal)).rejects.toThrow(
    "cancelled",
  );
  client.dispose();
  await expect(client.request("ready", null)).rejects.toThrow("disposed");
});
test("client validates failures and cleans up failed transports and owned lifecycle", async () => {
  const p = port(),
    client = createWorkerClient(p.transport, isDoc, true);
  let request = client.request("ready", null);
  p.emit({ version: 1, id: 1, ok: true, value: false });
  await expect(request).rejects.toThrow("Invalid");
  request = client.request("ready", null);
  p.emit({ version: 1, id: 2, ok: false });
  await expect(request).rejects.toThrow("Malformed worker error");
  for (const bad of [
    null,
    { version: 2 },
    { version: 1, id: "x" },
    { version: 1, id: -1 },
    { version: 1, id: 5, ok: 1 },
  ]) {
    request = client.request("ready", null);
    p.emit(bad);
    await expect(request).rejects.toThrow("Malformed");
  }
  request = client.request("ready", null);
  p.error();
  await expect(request).rejects.toThrow("crashed");
  expect(p.errors.size).toBe(0);
  client.dispose();
  client.dispose();
  expect(p.transport.terminate).toHaveBeenCalledTimes(1);
  const q = port(),
    other = createWorkerClient(
      { ...q.transport, terminate: undefined } as unknown as Transport,
      isDoc,
      true,
    );
  const outstanding = other.request("ready", null);
  other.dispose();
  await expect(outstanding).rejects.toThrow("disposed");
});
test("send failures reject without pending leaks; runtime serializes unknown errors and malformed requests", async () => {
  const p = port();
  p.transport.send = () => {
    throw new Error("clone");
  };
  const client = createWorkerClient(p.transport, isDoc);
  await expect(client.request("ready", null)).rejects.toThrow("clone");
  client.dispose();
  const runtime = port(),
    engine = createSearchEngine<Doc>({ id: "id", fields: { text: {} } });
  engine.clear = () => {
    throw "non-error";
  };
  attachWorkerRuntime(runtime.transport, engine, isDoc);
  runtime.emit(null);
  runtime.emit({ version: 1, id: 0 });
  runtime.emit({ version: 1, id: 2, operation: "unknown" });
  runtime.emit({ version: 1, id: 3, operation: "clear", payload: null });
  expect(runtime.sent).toContainEqual({
    version: 1,
    id: 3,
    ok: false,
    error: "Worker operation failed",
  });
  expect(runtime.sent[0]).toEqual({
    version: 1,
    id: 0,
    ok: false,
    error: "Invalid worker request",
  });
});
test("web adapter forwards messages and unsubscribes errors without implicit termination", () => {
  const endpoint = new EventTarget();
  const postMessage = vi.fn();
  const transport = webTransport(
    Object.assign(endpoint, { postMessage }) as unknown as MessagePort,
  );
  const listener = vi.fn(),
    error = vi.fn();
  const off = transport.onMessage(listener),
    offError = transport.onError(error);
  endpoint.dispatchEvent(new MessageEvent("message", { data: 42 }));
  transport.send("request");
  expect(listener).toHaveBeenCalledWith(42);
  expect(postMessage).toHaveBeenCalledWith("request");
  endpoint.dispatchEvent(new Event("error"));
  endpoint.dispatchEvent(new Event("messageerror"));
  expect(error).toHaveBeenCalledTimes(2);
  off();
  offError();
  endpoint.dispatchEvent(new MessageEvent("message", { data: 2 }));
  expect(listener).toHaveBeenCalledTimes(1);
  const terminate = vi.fn();
  webTransport(
    Object.assign(endpoint, { postMessage }) as unknown as MessagePort,
    terminate,
  ).terminate!();
  expect(terminate).toHaveBeenCalledTimes(1);
});
