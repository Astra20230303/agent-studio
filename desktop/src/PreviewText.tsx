import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { editorMatches } from './editorSearchMatches';
import { CopyText } from './CopyText';

export type PreviewTextHandle = { find: () => void };
export function PreviewText({ text, lineNumber, truncated, ref }: { text: string; lineNumber?: number; truncated?: boolean; ref: Ref<PreviewTextHandle> }) {
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const selected = useRef<HTMLElement>(null);
  const matches = useMemo(() => editorMatches(text, finding ? query : '', caseSensitive), [text, finding, query, caseSensitive]);
  const lines = useMemo(() => text.split('\n'), [text]);
  const current = Math.min(index, Math.max(0, matches.length - 1));
  const match = matches[current];
  const find = () => { setFinding(true); requestAnimationFrame(() => input.current?.focus()); };
  useImperativeHandle(ref, () => ({ find }));
  useEffect(() => { line.current?.scrollIntoView({ block: 'center' }); }, [text, lineNumber]);
  useEffect(() => { selected.current?.scrollIntoView({ block: 'center' }); }, [match]);
  const close = () => { setFinding(false); pre.current?.focus(); };
  const move = (direction: number) => { if (matches.length) setIndex((current + direction + matches.length) % matches.length); };
  let offset = 0;
  return <div className="preview-text">
    {!finding && <button onClick={find}>查找预览内容</button>}
    <CopyText source={text} label={truncated ? '复制已预览部分' : '复制预览内容'} />
    {finding && <section aria-label="预览查找" onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      <input ref={input} aria-label="查找预览内容" value={query} onChange={event => { setQuery(event.target.value); setIndex(0); }} onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); move(event.shiftKey ? -1 : 1); }
      }} />
      <label><input type="checkbox" checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setIndex(0); }} />区分大小写</label>
      <span role="status">{matches.length ? `${current + 1} / ${matches.length} 处匹配` : query ? '没有匹配' : '输入查找内容'}{truncated ? '（仅查找已预览部分）' : ''}</span>
      <button disabled={!matches.length} onClick={() => move(-1)}>上一处</button><button disabled={!matches.length} onClick={() => move(1)}>下一处</button><button onClick={close}>关闭预览查找</button>
    </section>}
    <pre ref={pre} tabIndex={0} aria-label="文件预览文本" style={{ overflow: 'auto', maxHeight: '55vh', whiteSpace: 'pre', margin: '12px 0' }}>{lines.map((value, index) => {
      const start = offset; offset += value.length + 1;
      const highlighted = match && match.start < start + value.length && match.end > start;
      const from = highlighted ? Math.max(0, match.start - start) : 0;
      const to = highlighted ? Math.min(value.length, match.end - start) : 0;
      return <span key={index} ref={index + 1 === lineNumber ? line : undefined} style={index + 1 === lineNumber ? { background: '#ffe08a', color: '#202020' } : undefined}>{highlighted ? <>{value.slice(0, from)}<mark ref={match.start >= start ? selected : undefined}>{value.slice(from, to)}</mark>{value.slice(to)}</> : value}{index < lines.length - 1 ? '\n' : ''}</span>;
    })}</pre>
  </div>;
}
