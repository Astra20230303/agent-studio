import { useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { extensionRequest } from './extensions';
export type ContextTokens = { last: number; total: number; window?: number };
export function readContextTokens(value: any): ContextTokens | undefined {
  const last = value?.last?.totalTokens, total = value?.total?.totalTokens, window = value?.modelContextWindow;
  if (![last, total].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0)) return;
  return { last, total, ...(typeof window === 'number' && Number.isFinite(window) && window > 0 ? { window } : {}) };
}
export function ContextUsage({ usage, threadId, disabled }: { usage?: ContextTokens; threadId?: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const compact = async () => {
    if (!threadId || disabled || lock.current) return;
    lock.current = true; setPending(true); setNotice(''); setError('');
    try { await extensionRequest('thread/compact/start', { threadId }); setNotice('已请求压缩上下文'); }
    catch (error) { setError(String(error)); }
    finally { lock.current = false; setPending(false); }
  };
  return <div className="context-usage" style={{ fontSize: 12, padding: '6px 0', overflowWrap: 'anywhere' }}>
    {usage && <details><summary>最近上下文 {usage.last.toLocaleString()}{usage.window ? ` / ${usage.window.toLocaleString()} Token (${Math.round(usage.last / usage.window * 100)}%)` : ' Token'}</summary>{usage.window && <meter aria-label="上下文用量" min={0} max={usage.window} value={Math.min(usage.last, usage.window)} />}<p>累计用量：{usage.total.toLocaleString()} Token</p></details>}
    {threadId && <button disabled={disabled || pending} onClick={() => void compact()}><Minimize2 size={14} />压缩上下文</button>}
    {notice && <span role="status">{notice}</span>}{error && <p role="alert">{error}</p>}
  </div>;
}
