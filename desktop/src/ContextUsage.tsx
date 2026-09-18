import { useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { extensionRequest } from './extensions';
export type ContextTokens = { last: number; total: number; window?: number };
export function readContextTokens(value: any): ContextTokens | undefined {
  const last = value?.last?.totalTokens, total = value?.total?.totalTokens, window = value?.modelContextWindow;
  if (![last, total].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0)) return;
  return { last, total, ...(typeof window === 'number' && Number.isFinite(window) && window > 0 ? { window } : {}) };
}
export function useContextCompaction(threadId?: string) {
  const [states, setStates] = useState<Record<string, { pending: boolean; notice?: string; error?: string }>>({});
  const locks = useRef(new Set<string>());
  const compact = async () => {
    if (!threadId || locks.current.has(threadId)) return;
    locks.current.add(threadId);
    setStates(current => ({ ...current, [threadId]: { pending: true } }));
    try {
      await extensionRequest('thread/compact/start', { threadId });
      setStates(current => ({ ...current, [threadId]: { pending: false, notice: '已请求压缩上下文' } }));
    } catch (error) { setStates(current => ({ ...current, [threadId]: { pending: false, error: String(error) } })); }
    finally { locks.current.delete(threadId); }
  };
  return { ...(threadId ? states[threadId] : undefined), compact };
}
export function ContextUsage({ usage, threadId, disabled, compaction }: { usage?: ContextTokens; threadId?: string; disabled: boolean; compaction: ReturnType<typeof useContextCompaction> }) {
  const { pending, notice, error } = compaction;
  return <div className="context-usage" style={{ fontSize: 12, padding: '6px 0', overflowWrap: 'anywhere' }}>
    {usage && <details><summary>最近上下文 {usage.last.toLocaleString()}{usage.window ? ` / ${usage.window.toLocaleString()} Token (${Math.round(usage.last / usage.window * 100)}%)` : ' Token'}</summary>{usage.window && <meter aria-label="上下文用量" min={0} max={usage.window} value={Math.min(usage.last, usage.window)} />}<p>累计用量：{usage.total.toLocaleString()} Token</p></details>}
    {threadId && <button disabled={disabled || pending} aria-busy={pending || false} onClick={() => { if (!disabled) void compaction.compact(); }}><Minimize2 size={14} />压缩上下文</button>}
    {notice && <span role="status">{notice}</span>}{error && <p role="alert">{error}</p>}
  </div>;
}
