import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { createTerminalStartupBuffer } from './terminalStartupBuffer';
import { readTerminalEvent } from './terminalEvents';
import type { ValidTerminalEvent } from './terminalEvents';
import { terminalText } from './terminalExport';
import { Play, Plus, Square, X, Trash2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import './terminal.css';
export type TerminalEvent = { id: string; type: 'data' | 'exit'; data?: string; code?: number };
export type TerminalBridge = {
  create: (cwd?: string) => Promise<{ ok: boolean; id: string }>;
  write: (id: string, data: string) => Promise<unknown>;
  resize: (id: string, cols: number, rows: number) => Promise<unknown>;
  close: (id: string) => Promise<unknown>;
  onData: (listener: (event: TerminalEvent) => void) => () => void;
};
export function TerminalPanel({ cwd, open, onClose }: { cwd?: string; open: boolean; onClose: () => void }) {
  const next = useRef(2);
  const [tabs, setTabs] = useState(() => [{ id: 1, cwd }]);
  const [selected, setSelected] = useState(1);
  const add = () => { const id = next.current++; setTabs(current => [...current, { id, cwd }]); setSelected(id); };
  const remove = () => {
    const remaining = tabs.filter(tab => tab.id !== selected);
    setTabs(remaining); setSelected(remaining[remaining.length - 1]?.id || 0);
  };
  return <section className="terminal-panel" hidden={!open} aria-label="终端">
    <div className="terminal-tabs"><div role="tablist" aria-label="终端会话">{tabs.map((tab, index) => <button key={tab.id} role="tab" tabIndex={selected === tab.id ? 0 : -1} id={`terminal-tab-${tab.id}`} aria-controls={`terminal-session-${tab.id}`} aria-selected={selected === tab.id} title={tab.cwd} onClick={() => setSelected(tab.id)} onKeyDown={event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined;
      if (target === undefined) return;
      event.preventDefault(); setSelected(tabs[target].id);
      document.getElementById(`terminal-tab-${tabs[target].id}`)?.focus();
    }}>终端 {tab.id}</button>)}</div>
      <button title="新建终端" aria-label="新建终端" disabled={tabs.length >= 8} onClick={add}><Plus size={16} /></button>
      <button title="关闭当前终端" aria-label="关闭当前终端" disabled={!tabs.length} onClick={remove}><Trash2 size={16} /></button>
      <button title="隐藏终端" aria-label="隐藏终端" onClick={onClose}><X size={16} /></button></div>
    {tabs.map(tab => <TerminalSession key={tab.id} id={tab.id} cwd={tab.cwd} open={open && selected === tab.id} />)}
  </section>;
}
function TerminalSession({ id, cwd, open }: { id: number; cwd?: string; open: boolean }) {
  const visible = useRef(open);
  visible.current = open;
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const search = useRef<SearchAddon | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const find = (previous = false, incremental = false) => {
    const options = { incremental, caseSensitive, wholeWord };
    setFound(Boolean(previous ? search.current?.findPrevious(query, options) : search.current?.findNext(query, options)));
  };
  const closeFind = () => { setFinding(false); search.current?.clearDecorations(); terminal.current?.clearSelection(); terminal.current?.focus(); };
  const refreshSearch = useRef(() => {});
  refreshSearch.current = () => { if (finding && query) find(false, true); };
  useEffect(() => { if (finding) { searchInput.current?.focus(); find(false, true); } }, [finding, query, caseSensitive, wholeWord]);
  const session = useRef<string | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('正在启动');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(true);
  const startLock = useRef(true);
  const restart = () => {
    if (startLock.current || session.current) return;
    startLock.current = true; setStarting(true); setRevision(value => value + 1);
  };
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState('');
  const exportLock = useRef(false);
  const exportLog = async () => {
    if (!terminal.current || exportLock.current) return;
    exportLock.current = true; setExporting(true); setExportNotice('');
    try {
      const content = terminalText(terminal.current.buffer.active);
      const filename = `terminal-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      const save = window.desktop?.saveTerminal;
      if (!save) throw Error('桌面日志导出不可用');
      const result = await save({ filename, content });
      if (!result.ok) throw Error(result.error || '导出失败');
      setExportNotice(result.canceled ? '已取消导出' : '已导出当前终端缓冲区');
    } catch (error) { setExportNotice(`导出失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { exportLock.current = false; setExporting(false); }
  };
  useEffect(() => {
    const bridge = window.desktop?.terminal;
    if (!bridge || !host.current) { startLock.current = false; setStarting(false); setStatus('启动失败'); setError('桌面终端不可用'); return; }
    const term = new Terminal({ cursorBlink: true, scrollback: 5000, fontSize: 13, theme: { background: '#191b1e', foreground: '#eeeeee' } });
    const addon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon); search.current = searchAddon;
    term.loadAddon(addon); term.open(host.current); terminal.current = term; fit.current = addon;
    const parsed = term.onWriteParsed(() => refreshSearch.current());
    let disposed = false;
    let ownedId: string | undefined;
    const pending = createTerminalStartupBuffer();
    let exited = false;
    const report = (failure: unknown) => { if (!disposed) setError(String(failure)); };
    const receive = (event: ValidTerminalEvent) => {
      if (event.id !== ownedId || disposed || exited) return;
      if (event.type === 'data') term.write(event.data);
      else { exited = true; setStatus(`已退出 (${event.code})`); setRunning(false); session.current = undefined; }
    };
    const off = bridge.onData(value => {
      if (disposed) return;
      const event = readTerminalEvent(value);
      if (!event) return;
      if (!ownedId) pending.push(event); else receive(event);
    });
    const input = term.onData(data => { if (session.current) void bridge.write(session.current, data).catch(report); });
    const resize = () => { if (!host.current?.clientWidth) return; addon.fit(); if (session.current) void bridge.resize(session.current, term.cols, term.rows).catch(report); };
    const observer = new ResizeObserver(resize); observer.observe(host.current);
    setStatus('正在启动'); setError(''); setExportNotice(''); setRunning(false);
    startLock.current = true; setStarting(true);
    void Promise.resolve().then(() => disposed ? undefined : bridge.create(cwd)).then(result => {
      if (result?.ok !== true || typeof result.id !== 'string' || !result.id.trim()) throw Error('终端启动失败：未获得有效会话');
      ownedId = result.id;
      if (disposed) { void bridge.close(ownedId).catch(() => {}); return; }
      startLock.current = false; setStarting(false);
      session.current = ownedId; setRunning(true); setStatus('运行中');
      const buffered = pending.drain(ownedId);
      if (buffered.truncated) setError('终端启动期间输出过多，部分输出未保留；日志可能不完整。');
      buffered.events.forEach(receive); resize(); if (visible.current) term.focus();
    }).catch(failure => {
      if (disposed) return;
      startLock.current = false; setStarting(false); setStatus('启动失败'); report(failure);
    });
    return () => {
      disposed = true; off(); input.dispose(); parsed.dispose(); observer.disconnect(); term.dispose();
      terminal.current = null; fit.current = null; session.current = undefined;
      search.current = null;
      if (ownedId) void bridge.close(ownedId).catch(() => {});
    };
  }, [cwd, revision]);
  useEffect(() => { if (open) { fit.current?.fit(); if (document.activeElement?.getAttribute('role') !== 'tab') terminal.current?.focus(); } }, [open]);
  return <section className="terminal-session" hidden={!open} role="tabpanel" id={`terminal-session-${id}`} aria-labelledby={`terminal-tab-${id}`} onKeyDownCapture={event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !event.altKey) { event.preventDefault(); event.stopPropagation(); setFinding(true); searchInput.current?.focus(); }
  }}>
    <header><strong>终端</strong><span title={cwd}>{cwd || '当前项目'}</span><small role="status">{status}</small>
      <button title="查找终端输出" aria-label="查找终端输出" onClick={() => finding ? closeFind() : setFinding(true)}>⌕</button>
      <button title="导出当前终端缓冲区（最多保留 5000 行历史）" aria-label="导出终端日志" disabled={exporting} onClick={() => void exportLog()}>⇩</button>
      <button title="重新启动终端" aria-label="重新启动终端" disabled={starting || running} onClick={restart}><Play size={16} /></button>
      <button title="终止终端" aria-label="终止终端" disabled={!running} onClick={() => { if (session.current) void window.desktop?.terminal?.close(session.current).catch(failure => setError(String(failure))); }}><Square size={16} /></button>
      </header>
    {finding && <div className="terminal-find"><input ref={searchInput} aria-label="查找终端输出内容" placeholder="查找终端缓冲区" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); find(event.shiftKey); }
      if (event.key === 'Escape') { event.preventDefault(); closeFind(); }
    }} /><label><input type="checkbox" checked={caseSensitive} onChange={event => setCaseSensitive(event.target.checked)} />区分大小写</label><label><input type="checkbox" checked={wholeWord} onChange={event => setWholeWord(event.target.checked)} />整词匹配</label><span role="status">{query ? found ? '已定位匹配' : '没有匹配' : '范围：当前终端缓冲区'}</span><button aria-label="终端上一个匹配" disabled={!query} onClick={() => find(true)}>↑</button><button aria-label="终端下一个匹配" disabled={!query} onClick={() => find()}>↓</button><button aria-label="关闭终端查找" onClick={closeFind}>×</button></div>}
    {exportNotice && <p role="status">{exportNotice}</p>}{error && <p role="alert">{error}</p>}<div ref={host} className="terminal-host" />
  </section>;
}
