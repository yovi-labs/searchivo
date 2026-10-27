/** Document identifier. Numbers must be finite; strings must be nonempty. */
export type DocumentId = string | number;
/** String keys whose values are assignable to V. */
export type KeysOfType<T, V> = Extract<
  { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T],
  string
>;
/** Positive finite multiplier for an indexed field. */
export interface FieldOptions {
  readonly boost?: number;
}
/** Configuration copied at construction. Only string-valued fields are searchable. */
export interface SearchConfig<T> {
  readonly id: KeysOfType<T, DocumentId>;
  readonly fields: Partial<Record<KeysOfType<T, string>, FieldOptions>>;
  /** Optional per-term, per-field scorer; return a finite nonnegative score. */
  readonly ranking?: RankingStrategy;
}
/** Statistics for one matched term in one field. No explanation metadata is allocated. */
export interface RankingContext {
  readonly frequency: number;
  readonly documentFrequency: number;
  readonly documentCount: number;
  readonly fieldLength: number;
  readonly averageFieldLength: number;
  readonly boost: number;
}
/** Pure per-field scoring function. Called only for positive term frequencies. */
export type RankingStrategy = (context: RankingContext) => number;
/** A ranked hit; document is a frozen shallow snapshot. Nested values remain caller-owned. */
export interface SearchResult<T> {
  readonly id: DocumentId;
  readonly document: Readonly<T>;
  readonly score: number;
}
/** Current index counts, returned as a detached snapshot. */
export interface IndexStats {
  readonly documents: number;
  readonly terms: number;
  readonly postings: number;
}
/** Synchronous local index. Batches are validated completely before mutation. */
export interface SearchEngine<T> {
  /** Monotonic mutation revision for optional derived indexes. */
  version(): number;
  /** Iterate normalized dictionary terms; do not mutate the engine during iteration. */
  vocabulary(): Iterable<string>;
  /** Add documents; duplicate IDs within the batch or index reject the whole batch. */
  add(documents: readonly T[]): void;
  /** Insert or replace documents; duplicate batch IDs reject. Replacements retain tie order. */
  upsert(documents: readonly T[]): void;
  /** Remove an ID, returning whether it existed. */
  remove(id: DocumentId): boolean;
  /** Clear all index data and reset insertion order. */
  clear(): void;
  /** Exact OR query. Repeated query terms count once; ties follow insertion order. */
  search(query: string): readonly SearchResult<T>[];
  /** Return current document, dictionary and term/document posting counts. */
  stats(): IndexStats;
}
