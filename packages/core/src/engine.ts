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
  const ranking = config.ranking;
  const totalLengths = fields.map(() => 0);
  const index = new Map<string, Map<DocumentId, number[]>>();
  let order = 0;
  let postingCount = 0;
  let version = 0;

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
    version++;
    existing.lengths.forEach((length, i) => {
      totalLengths[i] = totalLengths[i]! - length;
    });
    return true;
  }

  function mutate(batch: readonly T[], replace: boolean): void {
    const prepared = prepare(batch, replace);
    for (const [id, entry] of prepared) {
      entry.order = documents.get(id)?.order ?? order++;
      remove(id);
      documents.set(id, entry);
      version++;
      entry.lengths.forEach((length, i) => {
        totalLengths[i] = totalLengths[i]! + length;
      });
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
    version() {
      return version;
    },
    vocabulary() {
      return index.keys();
    },
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
      version++;
      totalLengths.fill(0);
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
          let score = scores.get(id) ?? 0;
          for (let i = 0; i < frequencies.length; i++) {
            const frequency = frequencies[i]!;
            if (frequency === 0) continue;
            const contribution = ranking
              ? ranking({
                  frequency,
                  documentFrequency: postings.size,
                  documentCount: documents.size,
                  fieldLength: documents.get(id)!.lengths[i]!,
                  averageFieldLength: totalLengths[i]! / documents.size,
                  boost: boosts[i]!,
                })
              : frequency * boosts[i]!;
            if (!Number.isFinite(contribution) || contribution < 0)
              throw new Error("ranking must return a finite nonnegative score");
            score += contribution;
          }
          if (!Number.isFinite(score))
            throw new Error(
              "ranking total overflowed; reduce boosts or scoring magnitude",
            );
          scores.set(id, score);
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
