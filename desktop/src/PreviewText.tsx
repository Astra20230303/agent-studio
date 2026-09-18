import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { editorMatches } from './editorSearchMatches';
import { CopyText } from './CopyText';
import { SearchMatchText } from './SearchMatchText';

export type PreviewTextHandle = { find: () => void; goToLine: () => void; currentPosition: () => { lineNumber?: number; column?: number; matchLength?: number } };
export function PreviewText({ text, lineNumber, column, matchLength, truncated, ref }: { text: string; lineNumber?: number; column?: number; matchLength?: number; truncated?: boolean; ref: Ref<PreviewTextHandle> }) {
  const [wrap, setWrap] = useState(false);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState(lineNumber);
  const [showSearchMatch, setShowSearchMatch] = useState(true);
  const [requestedLine, setRequestedLine] = useState(String(lineNumber || 1));
  const [lineError, setLineError] = useState('');
  const lineInput = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const selected = useRef<HTMLElement>(null);
  const matches = useMemo(() => editorMatches(text, finding ? query : '', caseSensitive), [text, finding, query, caseSensitive]);
  const lines = useMemo(() => text.split('\n'), [text]);
  const current = Math.min(index, Math.max(0, matches.length - 1));
  const match = matches[current];
  const find = () => { setFinding(true); requestAnimationFrame(() => input.current?.focus()); };
  useImperativeHandle(ref, () => ({ find, currentPosition: () => {
    if (finding && match) {
      const before = text.slice(0, match.start).replace(/\r\n/g, '\n');
      return { lineNumber: before.split('\n').length, column: before.length - before.lastIndexOf('\n'), matchLength: text.slice(match.start, match.end).replace(/\r\n/g, '\n').length };
    }
    if (selectedLine === undefined || !Number.isSafeInteger(selectedLine) || selectedLine < 1 || selectedLine > lines.length) return {};
    return { lineNumber: selectedLine, ...(showSearchMatch && selectedLine === lineNumber ? { column, matchLength } : {}) };
  }, goToLine: () => { lineInput.current?.focus(); lineInput.current?.select(); } }));
  useEffect(() => { setSelectedLine(lineNumber); setRequestedLine(String(lineNumber || 1)); setLineError(''); setShowSearchMatch(true); }, [text, lineNumber, column, matchLength]);
  useEffect(() => { if (!finding && showSearchMatch) pre.current?.querySelector('[data-search-match]')?.scrollIntoView({ block: 'center', inline: 'center' }); }, [text, lineNumber, column, matchLength, finding, showSearchMatch, wrap]);
  useEffect(() => { line.current?.scrollIntoView({ block: 'center' }); }, [text, selectedLine, wrap]);
  useEffect(() => { selected.current?.scrollIntoView({ block: 'center' }); }, [match, wrap]);
  const close = () => { setFinding(false); pre.current?.focus(); };
  const move = (direction: number) => { if (matches.length) setIndex((current + direction + matches.length) % matches.length); };
  let offset = 0;
  return <div className="preview-text">
    {!finding && <button onClick={find}>查找预览内容</button>}
    <button aria-label="预览自动换行" aria-pressed={wrap} onClick={() => setWrap(value => !value)}>{wrap ? '取消自动换行' : '自动换行'}</button>
    <CopyText source={text} label={truncated ? '复制已预览部分' : '复制预览内容'} />
    <form className="preview-line-navigation" aria-label="跳转到预览行" onSubmit={event => {
      event.preventDefault();
      const value = Number(requestedLine);
      if (!/^\d+$/.test(requestedLine) || !Number.isSafeInteger(value) || value < 1 || value > lines.length) {
        setLineError(`请输入 1 至 ${lines.length} 的行号${truncated ? '（仅限已预览部分）' : ''}。`); return;
      }
      setLineError(''); setSelectedLine(value); setShowSearchMatch(false); setFinding(false); pre.current?.focus();
      if (selectedLine === value) line.current?.scrollIntoView({ block: 'center' });
    }}>
      <label>行号 <input ref={lineInput} aria-label="预览行号" inputMode="numeric" value={requestedLine} onChange={event => { setRequestedLine(event.target.value); setLineError(''); }} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} /></label>
      <button type="submit">跳转到行</button><span>共 {lines.length} 行{truncated ? '（已预览部分）' : ''}</span>
    </form>
    {lineError && <p role="alert">{lineError}</p>}
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
    <pre ref={pre} tabIndex={0} aria-label="文件预览文本" style={{ overflow: 'auto', maxHeight: '55vh', minHeight: '1.5em', whiteSpace: wrap ? 'pre-wrap' : 'pre', overflowWrap: wrap ? 'anywhere' : 'normal', margin: '12px 0' }}>{lines.map((value, index) => {
      const start = offset; offset += value.length + 1;
      const highlighted = match && match.start < start + value.length && match.end > start;
      const from = highlighted ? Math.max(0, match.start - start) : 0;
      const to = highlighted ? Math.min(value.length, match.end - start) : 0;
      return <span key={index} data-line={index + 1} aria-current={index + 1 === selectedLine ? 'location' : undefined} ref={index + 1 === selectedLine ? line : undefined} style={index + 1 === selectedLine ? { background: '#ffe08a', color: '#202020' } : undefined}>{highlighted ? <>{value.slice(0, from)}<mark ref={match.start >= start ? selected : undefined}>{value.slice(from, to)}</mark>{value.slice(to)}</> : !finding && showSearchMatch && index + 1 === lineNumber ? <SearchMatchText text={value} column={column} length={matchLength} /> : value}{index < lines.length - 1 ? '\n' : ''}</span>;
    })}</pre>
  </div>;
}
