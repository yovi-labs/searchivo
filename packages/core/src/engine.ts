import { tokenize } from "./tokenize.js";
import type {
  DocumentId,
  SearchConfig,
  SearchEngine,
  SearchResult,
} from "./types.js";

interface Entry<T> {
  document: Readonly<T>;
  terms: Map<string, number[]>;
  lengths: number[];
  order: number;
}

/** Create a portable inverted index with atomic add/upsert and weighted term-frequency ranking. */
export function createSearchEngine<T>(
  config: SearchConfig<T>,
  initial: readonly T[] = [],
): SearchEngine<T> {
  if (typeof config.id !== "string" || config.id.length === 0)
    throw new Error("id must name a document field");
  const idField = config.id;
  const fields = Object.entries(config.fields) as [
    string,
    { boost?: number },
  ][];
  if (fields.length === 0)
    throw new Error("fields must contain at least one searchable string field");
  const boosts = fields.map(([field, options]) => {
    const boost = options.boost ?? 1;
    if (!Number.isFinite(boost) || boost <= 0)
      throw new Error(`boost for ${field} must be finite and positive`);
    return boost;
  });
  const documents = new Map<DocumentId, Entry<T>>();
  const index = new Map<string, Map<DocumentId, number[]>>();
  let order = 0;
  let postingCount = 0;

  function prepare(
    batch: readonly T[],
    replace: boolean,
  ): Map<DocumentId, Entry<T>> {
    const prepared = new Map<DocumentId, Entry<T>>();
    for (const source of batch) {
      const document = Object.freeze({ ...source });
      const id = document[idField];
      if (!(
        (typeof id === "string" && id.length > 0) ||
        (typeof id === "number" && Number.isFinite(id))
      ))
        throw new Error(
          "document ID must be a nonempty string or finite number",
        );
      if (prepared.has(id) || (!replace && documents.has(id)))
        throw new Error(`duplicate document ID: ${id}`);
      const terms = new Map<string, number[]>();
      const lengths: number[] = [];
      fields.forEach(([field], fieldIndex) => {
        const value: unknown = document[field as keyof T];
        if (typeof value !== "string")
          throw new Error(
            `document ${id}: searchable field ${field} must be a string`,
          );
        const tokens = tokenize(value);
        lengths.push(tokens.length);
        for (const token of tokens) {
          let frequencies = terms.get(token);
          if (!frequencies) {
            frequencies = fields.map(() => 0);
            terms.set(token, frequencies);
          }
          frequencies[fieldIndex] = frequencies[fieldIndex]! + 1;
        }
      });
      prepared.set(id, { document, terms, lengths, order: 0 });
    }
    return prepared;
  }

  function remove(id: DocumentId): boolean {
    const existing = documents.get(id);
    if (!existing) return false;
    for (const term of existing.terms.keys()) {
      const postings = index.get(term)!;
      postings.delete(id);
      postingCount--;
      if (postings.size === 0) index.delete(term);
    }
    documents.delete(id);
    return true;
  }

  function mutate(batch: readonly T[], replace: boolean): void {
    const prepared = prepare(batch, replace);
    for (const [id, entry] of prepared) {
      entry.order = documents.get(id)?.order ?? order++;
      remove(id);
      documents.set(id, entry);
      for (const [term, frequencies] of entry.terms) {
        let postings = index.get(term);
        if (!postings) {
          postings = new Map();
          index.set(term, postings);
        }
        postings.set(id, frequencies);
        postingCount++;
      }
    }
  }

  const engine: SearchEngine<T> = {
    add(batch) {
      mutate(batch, false);
    },
    upsert(batch) {
      mutate(batch, true);
    },
    remove,
    clear() {
      documents.clear();
      index.clear();
      postingCount = 0;
      order = 0;
    },
    stats() {
      return {
        documents: documents.size,
        terms: index.size,
        postings: postingCount,
      };
    },
    search(query) {
      const scores = new Map<DocumentId, number>();
      for (const term of new Set(tokenize(query))) {
        const postings = index.get(term);
        if (!postings) continue;
        for (const [id, frequencies] of postings) {
          const score = frequencies.reduce(
            (total, frequency, i) => total + frequency * boosts[i]!,
            0,
          );
          scores.set(id, (scores.get(id) ?? 0) + score);
        }
      }
      const results: SearchResult<T>[] = [];
      for (const [id, score] of scores)
        results.push({ id, score, document: documents.get(id)!.document });
      return results.sort(
        (a, b) =>
          b.score - a.score ||
          documents.get(a.id)!.order - documents.get(b.id)!.order,
      );
    },
  };
  engine.add(initial);
  return engine;
}
