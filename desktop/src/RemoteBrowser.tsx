import { useEffect, useState } from 'react';
import { Globe, Maximize2, Minimize2, RefreshCw, Square, X } from 'lucide-react';
import './remote-browser.css';

type Status = { connected: boolean; url: string; phase?: string };
type RemoteBridge = {
  remoteStatus?: () => Promise<Status>;
  remoteAction?: (action: { type: string }) => Promise<{ isError?: boolean; content: { type: string; text?: string }[] }>;
};

export function RemoteBrowser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<Status>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [revision, setRevision] = useState(0);
  const bridge = window.desktop as typeof window.desktop & RemoteBridge;
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const value = await bridge?.remoteStatus?.();
        if (!disposed) setStatus(value);
      } catch { if (!disposed) setError('无法读取连接状态'); }
      if (!disposed) timer = setTimeout(refresh, 1500);
    };
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, [open, bridge]);
  const run = async (type: string) => {
    setBusy(true); setError('');
    try {
      const result = await bridge?.remoteAction?.({ type });
      if (!result || result.isError) throw new Error(result?.content.find(part => part.type === 'text')?.text || '请在 Felix 桌面应用中使用');
      setStatus(await bridge.remoteStatus?.());
    } catch (e) { setError(e instanceof Error ? e.message : '连接失败'); }
    finally { setBusy(false); }
  };
  let source = '';
  if (status?.connected) {
    const url = new URL(status.url);
    url.searchParams.set('autoconnect', 'true');
    url.searchParams.set('resize', 'scale');
    // noVNC maps pointer and keyboard input using this canvas's own scale.
    // Share the remote desktop with the Agent's connection.
    url.searchParams.set('view_only', 'false');
    // wayvnc may send a transparent cursor when it is drawn into the remote
    // framebuffer. Keep a visible local pointer as a fallback.
    url.searchParams.set('show_dot', 'true');
    url.searchParams.set('shared', 'true');
    url.searchParams.set('host', url.hostname);
    url.searchParams.set('port', url.port || (url.protocol === 'https:' ? '443' : '80'));
    url.searchParams.set('encrypt', url.protocol === 'https:' ? 'true' : 'false');
    url.searchParams.set('path', 'websockify');
    source = url.href;
  }
  return <section id="remote-browser" aria-label="远程桌面浏览器" className={`remote-browser ${expanded ? 'expanded' : ''}`} hidden={!open}>
    <header className="remote-browser-toolbar">
      <span className="remote-browser-tab"><Globe size={16} />WayVNC · 远程桌面</span>
      <button aria-label="刷新远程桌面" disabled={!source} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} /></button>
      <button aria-label={expanded ? '还原浏览器面板' : '展开浏览器面板'} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
      <button aria-label="关闭浏览器面板" onClick={onClose}><X size={16} /></button>
    </header>
    <div className="remote-browser-address" title={status?.url}>{status?.url || '远程桌面'}<span>{status?.connected ? '已连接' : '未连接'}</span></div>
    {(error || status?.phase) && <p className="remote-browser-error" role="status">{error || status?.phase}</p>}
    {source ? <iframe key={`${source}-${revision}`} src={source} title="noVNC 远程桌面" sandbox="allow-scripts allow-same-origin" /> : <div className="remote-browser-empty"><Globe size={32} /><h3>远程桌面</h3><p>在聊天旁查看 Agent 操作的实时画面</p><button disabled={busy} onClick={() => void run('connect')}>{busy ? '正在连接…' : '连接远程桌面'}</button></div>}
    <footer><span>可用鼠标、键盘操作 · 与 Agent 共享桌面</span><button onClick={() => void run('disconnect')}><Square size={12} />停止控制</button></footer>
  </section>;
}
