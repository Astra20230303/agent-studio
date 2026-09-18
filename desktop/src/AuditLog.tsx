import { useMemo, useState } from 'react';
import type { AuditEntry } from './useAuditLog';

export function AuditLog({ entries, error, onClear, onRetry, readFailed }: { entries: AuditEntry[]; error?: string; onClear: () => void; onRetry: () => void; readFailed: boolean }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? entries.filter(item => `${item.action} ${item.detail || ''}`.toLocaleLowerCase().includes(needle)) : entries;
  }, [entries, query]);
  return <section aria-label="操作记录">
    <p>保留最近 200 条本机操作，包括会话新建、切换、置顶、取消置顶、重命名、归档、删除、分叉，以及渠道、权限、审批响应、服务重启和回合状态。不记录消息正文、会话标题、问题答案或密钥。</p>
    <div className="audit-toolbar"><input type="search" aria-label="搜索操作记录" placeholder="搜索操作记录…" value={query} onChange={event => setQuery(event.target.value)} /><button disabled={!entries.length} onClick={onClear}>清空记录</button></div>
    {error && <p role="alert">{error}{!readFailed && <button onClick={onRetry}>重试保存操作记录</button>}</p>}
    {!visible.length ? <p role="status">{query ? '没有匹配的操作记录' : '暂无操作记录'}</p> : <ol className="audit-list">{visible.map(item => <li key={item.id}><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time><strong>{item.action}</strong>{item.detail && <span>{item.detail}</span>}</li>)}</ol>}
  </section>;
}
