import { useState } from 'react';
import { listThreadTimeline } from './codexClient';
import type { TimelineEntry } from './threadTimeline';
const time = (value?: number | null) => value == null ? '' : ` · ${new Date(value * 1000).toLocaleString()}`;
export function ThreadTimelinePanel({ threadId, connected, busy }: { threadId?: string; connected: boolean; busy?: boolean }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const load = async () => { if (!threadId || !connected || busy || loading) return; setLoading(true); setError(''); try { setEntries(await listThreadTimeline(threadId)); setOpen(true); } catch (error) { setError(error instanceof Error ? error.message : String(error)); } finally { setLoading(false); } };
  if (!threadId) return null;
  return <section aria-label="会话时间线"><button disabled={!connected || busy || loading} onClick={() => void load()}>{loading ? '正在读取时间线…' : open ? '刷新会话时间线' : '查看会话时间线'}</button>{error && <p role="alert">读取时间线失败：{error}</p>}{open && <ol>{entries.map(entry => <li key={`${entry.position}-${entry.type}`}>{entry.type === 'item' ? `条目 · ${entry.itemType} · ${entry.itemId}` : entry.type === 'realtime' ? '实时会话条目' : entry.type === 'turnStarted' ? `回合开始 · ${entry.turnId}${time(entry.startedAt)}` : `回合完成 · ${entry.status} · ${entry.turnId}${time(entry.completedAt)}${entry.durationMs != null ? ` · ${entry.durationMs} ms` : ''}`}</li>)}</ol>}</section>;
}
