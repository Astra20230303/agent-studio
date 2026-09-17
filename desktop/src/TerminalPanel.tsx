import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
  const session = useRef<string | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('正在启动');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const bridge = window.desktop?.terminal;
    if (!bridge || !host.current) { setError('桌面终端不可用'); return; }
    const term = new Terminal({ cursorBlink: true, scrollback: 5000, fontSize: 13, theme: { background: '#191b1e', foreground: '#eeeeee' } });
    const addon = new FitAddon();
    term.loadAddon(addon); term.open(host.current); terminal.current = term; fit.current = addon;
    let disposed = false;
    let ownedId: string | undefined;
    const pending: TerminalEvent[] = [];
    const report = (failure: unknown) => { if (!disposed) setError(String(failure)); };
    const receive = (event: TerminalEvent) => {
      if (event.id !== ownedId || disposed) return;
      if (event.type === 'data') term.write(event.data || '');
      else { setStatus(`已退出 (${event.code})`); setRunning(false); session.current = undefined; }
    };
    const off = bridge.onData(event => { if (!ownedId) { if (pending.length < 1000) pending.push(event); } else receive(event); });
    const input = term.onData(data => { if (session.current) void bridge.write(session.current, data).catch(report); });
    const resize = () => { if (!host.current?.clientWidth) return; addon.fit(); if (session.current) void bridge.resize(session.current, term.cols, term.rows).catch(report); };
    const observer = new ResizeObserver(resize); observer.observe(host.current);
    setStatus('正在启动'); setError(''); setRunning(false);
    void bridge.create(cwd).then(result => {
      if (!result.ok) throw Error('终端启动失败');
      ownedId = result.id;
      if (disposed) { void bridge.close(ownedId).catch(() => {}); return; }
      session.current = ownedId; setRunning(true); setStatus('运行中');
      pending.forEach(receive); pending.length = 0; resize(); if (visible.current) term.focus();
    }).catch(report);
    return () => {
      disposed = true; off(); input.dispose(); observer.disconnect(); term.dispose();
      terminal.current = null; fit.current = null; session.current = undefined;
      if (ownedId) void bridge.close(ownedId).catch(() => {});
    };
  }, [cwd, revision]);
  useEffect(() => { if (open) { fit.current?.fit(); if (document.activeElement?.getAttribute('role') !== 'tab') terminal.current?.focus(); } }, [open]);
  return <section className="terminal-session" hidden={!open} role="tabpanel" id={`terminal-session-${id}`} aria-labelledby={`terminal-tab-${id}`}>
    <header><strong>终端</strong><span title={cwd}>{cwd || '当前项目'}</span><small role="status">{status}</small>
      <button title="重新启动终端" aria-label="重新启动终端" disabled={running} onClick={() => setRevision(value => value + 1)}><Play size={16} /></button>
      <button title="终止终端" aria-label="终止终端" disabled={!running} onClick={() => { if (session.current) void window.desktop?.terminal?.close(session.current).catch(failure => setError(String(failure))); }}><Square size={16} /></button>
      </header>
    {error && <p role="alert">{error}</p>}<div ref={host} className="terminal-host" />
  </section>;
}
