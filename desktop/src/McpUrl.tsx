import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export function McpUrl({ request, onDecision }: { request: any; onDecision: (action: string) => Promise<void> }) {
  const params = request.params || {};
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  let url: URL | undefined;
  try { const parsed = new URL(params.url); if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed; } catch {}
  const run = async (action: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (action === 'open') {
        if (!url || !window.desktop?.openExternal) throw Error('无法打开此链接');
        await window.desktop.openExternal(url.href); setOpened(true);
      } else await onDecision(action);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="approval-backdrop"><section ref={dialog} className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="mcp-url-title" style={{ overflowWrap: 'anywhere', maxHeight: '85vh', overflow: 'auto' }} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
    const first = buttons[0], last = buttons.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}>
    <h2 id="mcp-url-title">{params.serverName || 'MCP'} 请求打开网页</h2><p>{params.message}</p><p>{String(params.url || '')}</p>
    {!url && <p role="alert">链接无效或协议不受支持。</p>}{error && <p role="alert">{error}</p>}
    <button disabled={busy || !url} onClick={() => void run('open')}><ExternalLink size={16} />打开网页</button>
    <div className="approval-actions" style={{ flexWrap: 'wrap' }}><button disabled={busy} onClick={() => void run('cancel')}>取消</button><button disabled={busy} onClick={() => void run('decline')}>拒绝</button><button disabled={busy || !opened || !url} onClick={() => void run('accept')}>确认继续</button></div>
  </section></div>;
}
