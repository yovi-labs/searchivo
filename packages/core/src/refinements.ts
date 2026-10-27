import type { KeysOfType, SearchResult } from "./types.js";
/** Values supported by filters, facets and sorting. */
export type Scalar = string | number | boolean;
/** Field-specific comparison; numeric ranges are available only for numeric fields. */
export type Filter<T> = {
  [K in KeysOfType<T, Scalar>]: { readonly field: K } & (
    | { readonly op: "eq"; readonly value: T[K] }
    | { readonly op: "in"; readonly values: readonly T[K][] }
    | (T[K] extends number
        ? { readonly op: "range"; readonly min?: number; readonly max?: number }
        : never)
  );
}[KeysOfType<T, Scalar>];
/** Refinement settings; all filters are ANDed. */
export interface Refinements<T> {
  readonly filters?: readonly Filter<T>[];
  readonly facets?: readonly KeysOfType<T, Scalar>[];
  readonly sort?: {
    readonly field: KeysOfType<T, Scalar>;
    readonly direction: "asc" | "desc";
  };
  readonly offset?: number;
  readonly limit?: number;
}
/** Facet count for one scalar value. */
export interface FacetCount {
  readonly value: Scalar;
  readonly count: number;
}
/** Refined response with totals and conjunctive facets computed before pagination. */
export interface RefinedResults<T> {
  readonly results: readonly SearchResult<T>[];
  readonly total: number;
  readonly facets: Readonly<
    Partial<Record<KeysOfType<T, Scalar>, readonly FacetCount[]>>
  >;
}
/** Apply typed filters/facets/sort/page without changing the input. Facets are not disjunctive. */
export function refine<T>(
  hits: readonly SearchResult<T>[],
  options: Refinements<T> = {},
): RefinedResults<T> {
  const { filters = [], facets = [], sort, offset = 0, limit = 20 } = options;
  for (const [name, value] of Object.entries({ offset, limit }))
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`${name} must be a nonnegative safe integer`);
  for (const filter of filters)
    if (filter.op === "range") {
      if (
        (filter.min !== undefined && !Number.isFinite(filter.min)) ||
        (filter.max !== undefined && !Number.isFinite(filter.max)) ||
        (filter.min !== undefined &&
          filter.max !== undefined &&
          filter.min > filter.max)
      )
        throw new Error("range bounds must be finite and min <= max");
    }
  const selected = hits.filter((hit) =>
    filters.every((filter) => {
      const value = hit.document[filter.field];
      if (filter.op === "eq") return value === filter.value;
      if (filter.op === "in") return filter.values.includes(value);
      return (
        typeof value === "number" &&
        (filter.min === undefined || value >= filter.min) &&
        (filter.max === undefined || value <= filter.max)
      );
    }),
  );
  const counts: Partial<Record<KeysOfType<T, Scalar>, readonly FacetCount[]>> =
    {};
  for (const field of facets) {
    const values = new Map<Scalar, number>();
    for (const hit of selected) {
      const value = hit.document[field] as Scalar;
      values.set(value, (values.get(value) ?? 0) + 1);
    }
    Object.defineProperty(counts, field, {
      value: [...values].map(([value, count]) => ({ value, count })),
      enumerable: true,
      configurable: true,
    });
  }
  if (sort)
    selected.sort((a, b) => {
      const left = a.document[sort.field] as Scalar,
        right = b.document[sort.field] as Scalar;
      const comparison = left < right ? -1 : left > right ? 1 : 0;
      return sort.direction === "asc" ? comparison : -comparison;
    });
  return {
    results: selected.slice(offset, offset + limit),
    total: selected.length,
    facets: counts,
  };
}
