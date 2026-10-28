import type { SearchController } from "@searchivo/core/state";
/** A small local state-transition summary; no document payloads or remote telemetry. */
export interface SearchRecord {
  readonly query: string;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly total: number;
  readonly duration: number;
}
/** Bounded headless recorder. Dispose explicitly when the debugging session ends. */
export function recordSearch<T>(
  controller: SearchController<T>,
  limit = 50,
): { entries(): readonly SearchRecord[]; clear(): void; dispose(): void } {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000)
    throw new Error("record limit must be an integer in [1, 10000]");
  const records: SearchRecord[] = [];
  const unsubscribe = controller.subscribe((state) => {
    records.push({
      query: state.query,
      loading: state.loading,
      failed: state.error !== undefined,
      total: state.total,
      duration: state.duration,
    });
    if (records.length > limit) records.shift();
  });
  return {
    entries() {
      return records.map((record) => ({ ...record }));
    },
    clear() {
      records.length = 0;
    },
    dispose: unsubscribe,
  };
}
