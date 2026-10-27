/** Normalize with Unicode NFKC and locale-independent lowercase; split letters/numbers. */
export function tokenize(text: string): readonly string[] {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .match(/[\p{L}\p{N}\p{M}]+/gu) ?? []
  );
}
