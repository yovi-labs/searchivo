// @vitest-environment jsdom
import "@angular/compiler";
import { afterEach, expect, test } from "vitest";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { createSearchivo, SearchivoInputDirective } from "../src/index.js";
import { createSearchEngine } from "@searchivo/core";
import { localSource } from "@searchivo/core/source";
import type {
  CancellationSignal,
  SearchResponse,
} from "@searchivo/core/source";
const binding = createSearchivo(
  localSource(
    createSearchEngine({ id: "id", fields: { name: {} } }, [
      { id: 1, name: "phone" },
    ]),
  ),
);
@Component({
  standalone: true,
  imports: [SearchivoInputDirective],
  providers: binding.provide(),
  template: '<input searchivo aria-label="Search">',
})
class Host {
  readonly search = binding.inject();
}
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
afterEach(() => TestBed.resetTestingModule());
test("scoped async state ignores stale responses and aborts on destroy", async () => {
  const pending: {
    resolve: (value: SearchResponse<{ id: number }>) => void;
    signal: CancellationSignal;
  }[] = [];
  const asynchronous = createSearchivo<{ id: number }>(
    (_request, signal) =>
      new Promise((resolve) => pending.push({ resolve, signal })),
  );
  @Component({
    standalone: true,
    providers: asynchronous.provide(),
    template: "",
  })
  class AsyncHost {
    readonly search = asynchronous.inject();
  }
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const host = TestBed.createComponent(AsyncHost);
  host.componentInstance.search.setQuery("old");
  host.componentInstance.search.setQuery("new");
  expect(pending[0]!.signal.aborted).toBe(true);
  pending[1]!.resolve({ results: [], facets: {}, total: 2 });
  await Promise.resolve();
  pending[0]!.resolve({ results: [], facets: {}, total: 1 });
  await Promise.resolve();
  expect(host.componentInstance.search.state().total).toBe(2);
  host.componentInstance.search.setQuery("pending");
  host.destroy();
  expect(pending[2]!.signal.aborted).toBe(true);
  pending[2]!.resolve({ results: [], facets: {}, total: 3 });
  await Promise.resolve();
  expect(host.componentInstance.search.state().total).toBe(2);
});
test("scopes providers, updates Signals and synchronizes native inputs without zones", async () => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const a = TestBed.createComponent(Host),
    b = TestBed.createComponent(Host);
  a.detectChanges();
  b.detectChanges();
  const input: HTMLInputElement = a.nativeElement.querySelector("input");
  input.value = "phone";
  input.dispatchEvent(new InputEvent("input"));
  await a.whenStable();
  expect(a.componentInstance.search.state().total).toBe(1);
  expect(b.componentInstance.search.state().query).toBe("");
  a.componentInstance.search.setQuery("other");
  await a.whenStable();
  expect(input.value).toBe("other");
  a.destroy();
  await expect(
    a.componentInstance.search.controller.search({ query: "x" }),
  ).rejects.toThrow("disposed");
});
test("IME composition defers search and prevents programmatic overwrites until committed", async () => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const host = TestBed.createComponent(Host);
  host.detectChanges();
  const input: HTMLInputElement = host.nativeElement.querySelector("input");
  input.dispatchEvent(new CompositionEvent("compositionstart"));
  input.value = "pho";
  input.dispatchEvent(new InputEvent("input", { isComposing: true }));
  expect(host.componentInstance.search.query()).toBe("");
  host.componentInstance.search.setQuery("background");
  await host.whenStable();
  expect(input.value).toBe("pho");
  input.value = "phone";
  input.dispatchEvent(new CompositionEvent("compositionend"));
  await host.whenStable();
  expect(host.componentInstance.search.state().total).toBe(1);
  input.value = "ignored";
  input.dispatchEvent(new InputEvent("input", { isComposing: true }));
  expect(host.componentInstance.search.query()).toBe("phone");
});
