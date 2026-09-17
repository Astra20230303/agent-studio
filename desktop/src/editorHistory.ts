export type EditorHistory = { text: string; past: string[]; future: string[] };
export const newEditorHistory = (text: string): EditorHistory => ({ text, past: [], future: [] });
function bounded(values: string[]): string[] {
  let length = 0; let start = values.length;
  while (start > 0 && values.length - start < 100) {
    const size = values[start - 1].length;
    if (length + size > 4 * 1024 * 1024) break;
    length += size; start--;
  }
  return values.slice(start);
}
export function editHistory(history: EditorHistory, text: string): EditorHistory {
  return text === history.text ? history : { text, past: bounded([...history.past, history.text]), future: [] };
}
export function stepHistory(history: EditorHistory, redo = false): EditorHistory {
  const source = redo ? history.future : history.past;
  if (!source.length) return history;
  const text = source[source.length - 1];
  return redo ? { text, past: bounded([...history.past, history.text]), future: source.slice(0, -1) }
    : { text, past: source.slice(0, -1), future: bounded([...history.future, history.text]) };
}
