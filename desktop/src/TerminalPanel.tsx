import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Play, Square, X } from 'lucide-react';
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
      pending.forEach(receive); pending.length = 0; resize(); term.focus();
    }).catch(report);
    return () => {
      disposed = true; off(); input.dispose(); observer.disconnect(); term.dispose();
      terminal.current = null; fit.current = null; session.current = undefined;
      if (ownedId) void bridge.close(ownedId).catch(() => {});
    };
  }, [cwd, revision]);
  useEffect(() => { if (open) { fit.current?.fit(); terminal.current?.focus(); } }, [open]);
  return <section className="terminal-panel" hidden={!open} aria-label="终端">
    <header><strong>终端</strong><span title={cwd}>{cwd || '当前项目'}</span><small role="status">{status}</small>
      <button title="重新启动终端" aria-label="重新启动终端" disabled={running} onClick={() => setRevision(value => value + 1)}><Play size={16} /></button>
      <button title="终止终端" aria-label="终止终端" disabled={!running} onClick={() => { if (session.current) void window.desktop?.terminal?.close(session.current).catch(failure => setError(String(failure))); }}><Square size={16} /></button>
      <button title="隐藏终端" aria-label="隐藏终端" onClick={onClose}><X size={16} /></button></header>
    {error && <p role="alert">{error}</p>}<div ref={host} className="terminal-host" />
  </section>;
}
