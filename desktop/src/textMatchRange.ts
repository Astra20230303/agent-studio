// Search columns are one-based UTF-16 offsets, matching JavaScript string slices.
export function textMatchRange(text: string, column?: number, length?: number) {
  if (!Number.isSafeInteger(column) || !Number.isSafeInteger(length) || column! < 1 || length! < 1) return undefined;
  const start = column! - 1;
  const end = start + length!;
  if (end > text.length) return undefined;
  return { start, end };
}
