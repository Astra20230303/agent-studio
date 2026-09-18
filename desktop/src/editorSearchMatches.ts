export function editorMatches(text: string, query: string, caseSensitive: boolean, wholeWord = false): { start: number; end: number }[] {
  if (!query) return [];
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = '[\\p{L}\\p{N}\\p{M}_]';
  const pattern = new RegExp(wholeWord ? `(?<!${word})${literal}(?!${word})` : literal, caseSensitive ? 'gu' : 'giu');
  return Array.from(text.matchAll(pattern), match => ({ start: match.index, end: match.index + match[0].length }));
}
