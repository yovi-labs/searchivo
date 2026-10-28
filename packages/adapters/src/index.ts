import type { DocumentId, KeysOfType, SearchResult } from "@searchivo/core";
import type { Scalar, FacetCount } from "@searchivo/core/refinements";
import type { SearchResponse, SearchSource } from "@searchivo/core/source";
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function scalar(value: unknown): value is Scalar {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
/** Validate an unknown backend response before exposing document types. */
export function parseSearchResponse<T>(
  value: unknown,
  isDocument: (value: unknown) => value is T,
  facetFields: readonly KeysOfType<T, Scalar>[] = [],
): SearchResponse<T> {
  if (
    !record(value) ||
    !Array.isArray(value.results) ||
    !Number.isSafeInteger(value.total) ||
    (value.total as number) < value.results.length ||
    !record(value.facets)
  )
    throw new Error("Invalid search response envelope");
  const ids = new Set<DocumentId>();
  const results: SearchResult<T>[] = [];
  for (const hit of value.results as unknown[]) {
    if (
      !record(hit) ||
      !(
        (typeof hit.id === "string" && hit.id.length > 0) ||
        (typeof hit.id === "number" && Number.isFinite(hit.id))
      ) ||
      typeof hit.score !== "number" ||
      !Number.isFinite(hit.score) ||
      hit.score < 0 ||
      !isDocument(hit.document)
    )
      throw new Error("Invalid search result");
    if (ids.has(hit.id)) throw new Error("Duplicate search result ID");
    ids.add(hit.id);
    results.push({ id: hit.id, score: hit.score, document: hit.document });
  }
  const facets: Partial<Record<KeysOfType<T, Scalar>, readonly FacetCount[]>> =
    {};
  for (const [field, buckets] of Object.entries(value.facets)) {
    if (
      !facetFields.includes(field as KeysOfType<T, Scalar>) ||
      !Array.isArray(buckets)
    )
      throw new Error(`Unexpected facet: ${field}`);
    const counts: FacetCount[] = [];
    for (const bucket of buckets as unknown[]) {
      if (
        !record(bucket) ||
        !scalar(bucket.value) ||
        !Number.isSafeInteger(bucket.count) ||
        (bucket.count as number) < 0 ||
        (bucket.count as number) > (value.total as number)
      )
        throw new Error("Invalid facet count");
      counts.push({ value: bucket.value, count: bucket.count as number });
    }
    Object.defineProperty(facets, field, { value: counts, enumerable: true });
  }
  if (value.metadata !== undefined && !record(value.metadata))
    throw new Error("Invalid response metadata");
  return {
    results,
    total: value.total as number,
    facets,
    ...(value.metadata === undefined ? {} : { metadata: value.metadata }),
  };
}
/** HTTP adapter options; parse documents with a real runtime guard, not an assertion. */
export interface HttpSourceOptions<T> {
  readonly endpoint: string;
  readonly isDocument: (value: unknown) => value is T;
  readonly facetFields?: readonly KeysOfType<T, Scalar>[];
  /** Finite positive timeout in milliseconds; default 10000. */
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
}
/** POST JSON source with independent timeout/abort rejection and validated responses. */
export function createHttpSource<T>({
  endpoint,
  isDocument,
  facetFields = [],
  timeoutMs = 10000,
  fetch: fetcher = globalThis.fetch,
}: HttpSourceOptions<T>): SearchSource<T> {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("HTTP source endpoint must use http or https");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
    throw new Error("timeoutMs must be positive and at most 2147483647");
  return async (request, signal) => {
    if (signal.aborted) throw new Error("HTTP search cancelled");
    const controller = new AbortController();
    let rejectCancellation!: (error: Error) => void;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectCancellation = reject;
    });
    const abort = () => {
      controller.abort();
      rejectCancellation(new Error("HTTP search cancelled"));
    };
    signal.addEventListener("abort", abort);
    const timeout = setTimeout(() => {
      controller.abort();
      rejectCancellation(new Error("HTTP search timed out"));
    }, timeoutMs);
    try {
      const transport = async (): Promise<SearchResponse<T>> => {
        const response = await fetcher(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
        const data: unknown = await response.json();
        return parseSearchResponse(data, isDocument, facetFields);
      };
      return await Promise.race([transport(), cancelled]);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  };
}
