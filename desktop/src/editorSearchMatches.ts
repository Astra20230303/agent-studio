export function editorMatches(text: string, query: string, caseSensitive: boolean): { start: number; end: number }[] {
  if (!query) return [];
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'gu' : 'giu');
  return Array.from(text.matchAll(pattern), match => ({ start: match.index, end: match.index + match[0].length }));
}
