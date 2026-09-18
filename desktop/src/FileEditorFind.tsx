import { revealEditorSelection } from './editorLine';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { editorMatches } from './editorSearchMatches';
export function EditorFind({ text, onChange, editor, disabled, onClose }: { text: string; onChange: (text: string) => void; editor: RefObject<HTMLTextAreaElement | null>; disabled: boolean; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);
  const matches = useMemo(() => editorMatches(text, query, caseSensitive, wholeWord), [text, query, caseSensitive, wholeWord]);
  const current = Math.min(index, Math.max(0, matches.length - 1));
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { const match = matches[current]; if (match && editor.current) { editor.current.setSelectionRange(match.start, match.end); revealEditorSelection(editor.current, match.start); } }, [matches, current, editor]);
  const move = (direction: number) => { if (matches.length) setIndex((current + direction + matches.length) % matches.length); };
  const replace = (all: boolean) => {
    if (disabled || !matches.length) return;
    if (all) {
      let end = 0; let output = '';
      for (const match of matches) { output += text.slice(end, match.start) + replacement; end = match.end; }
      onChange(output + text.slice(end)); setIndex(0);
    } else {
      const match = matches[current];
      const next = text.slice(0, match.start) + replacement + text.slice(match.end);
      const nextIndex = editorMatches(next, query, caseSensitive, wholeWord).findIndex(item => item.start >= match.start + replacement.length);
      onChange(next); setIndex(Math.max(0, nextIndex));
    }
  };
  return <section aria-label="编辑器查找替换" onKeyDown={event => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); editor.current?.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); move(event.shiftKey ? -1 : 1); }
  }}>
    <input ref={input} aria-label="查找编辑内容" value={query} onChange={event => { setQuery(event.target.value); setIndex(0); }} />
    <label><input type="checkbox" checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setIndex(0); }} />区分大小写</label>
    <label><input type="checkbox" checked={wholeWord} onChange={event => { setWholeWord(event.target.checked); setIndex(0); }} />整词匹配</label>
    <span role="status">{matches.length ? `${current + 1} / ${matches.length} 处匹配` : '没有匹配'}</span>
    <button disabled={!matches.length} onClick={() => move(-1)}>上一处</button><button disabled={!matches.length} onClick={() => move(1)}>下一处</button>
    <input aria-label="替换为" value={replacement} onChange={event => setReplacement(event.target.value)} />
    <button disabled={disabled || !matches.length} onClick={() => replace(false)}>替换当前</button><button disabled={disabled || !matches.length} onClick={() => replace(true)}>全部替换</button>
    <button onClick={() => { onClose(); editor.current?.focus(); }}>关闭查找替换</button>
  </section>;
}
