import { textMatchRange } from './textMatchRange';

export function SearchMatchText({ text, column, length }: { text: string; column?: number; length?: number }) {
  const range = textMatchRange(text, column, length);
  return range ? <>{text.slice(0, range.start)}<mark data-search-match>{text.slice(range.start, range.end)}</mark>{text.slice(range.end)}</> : <>{text}</>;
}
