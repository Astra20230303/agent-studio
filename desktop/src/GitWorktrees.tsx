import { useEffect, useRef, useState } from 'react';
import type { Project } from './domain';
type Worktree = { primary?: boolean; current?: boolean; path: string; branch?: string; head?: string; detached?: boolean; bare?: boolean; locked?: string | boolean; prunable?: string | boolean };
export function GitWorktrees({ root, protectedPaths = [], onOpen, onBusyChange }: { protectedPaths?: string[]; onBusyChange?: (busy: boolean) => void; root: string; onOpen: (project: Project) => void }) {
  const isProtected = (path: string) => {
    const normalize = (value: string) => { const result = value.replaceAll('\\', '/').replace(/\/+$/, ''); return /^[a-z]:\//i.test(result) || result.startsWith('//') ? result.toLowerCase() : result; };
    const target = normalize(path);
    return protectedPaths.some(value => { const workspace = normalize(value); return workspace === target || workspace.startsWith(target + '/'); });
  };
  const [entries, setEntries] = useState<Worktree[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<Worktree>();
  const [notice, setNotice] = useState('');
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => { generation.current++; return () => { generation.current++; }; }, [root]);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceGit?.({ root, action: 'worktrees' });
        if (disposed) return;
        if (!result?.ok) throw Error(result?.error || '无法读取工作树');
        setEntries(result.result.worktrees);
      } catch (error) { if (!disposed) setError(String(error instanceof Error ? error.message : error)); }
      finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; };
  }, [root, revision]);
  const open = async (path: string, remove = false) => {
    if (lock.current) return;
    if (remove && isProtected(path)) { setError('工作树仍有会话活动或待发送消息，请先完成或取消。'); return; }
    lock.current = true; setBusy(true); setError('');
    const requestGeneration = generation.current;
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action: remove ? 'remove-worktree' : 'open-worktree', path, ...(remove ? { expectedHead: removing?.head } : {}) });
      if (requestGeneration !== generation.current) return;
      if (!result?.ok) throw Error(result?.error || (remove ? '无法删除工作树' : '无法打开工作树'));
      if (remove) { setRemoving(undefined); setNotice(`已删除工作树 ${path}，分支与提交保留。`); setRevision(value => value + 1); }
      else onOpen(result.result);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section aria-label="已有工作树"><h3>已有工作树</h3><button disabled={loading || busy} onClick={() => setRevision(value => value + 1)}>刷新工作树</button>
    {notice && <p role="status">{notice}</p>}
    {removing && <div role="alert"><p>删除工作树目录 {removing.path}？分支和提交记录将保留。</p><button disabled={busy || isProtected(removing.path)} onClick={() => void open(removing.path, true)}>确认删除工作树</button><button disabled={busy} onClick={() => setRemoving(undefined)}>取消删除工作树</button></div>}
    {error && <p role="alert">{error}</p>}{loading ? <p>正在读取工作树…</p> : entries.map(entry => <div key={entry.path}>
      <p>{entry.path}</p><p>{entry.bare ? '裸仓库' : entry.branch || `游离 HEAD · ${entry.head?.slice(0, 8) || ''}`}{entry.primary ? ' · 主工作树' : ''}{entry.current ? ' · 当前工作树' : ''}{entry.locked !== undefined ? ' · 已锁定' : ''}{entry.prunable ? ' · 已失效' : ''}{isProtected(entry.path) ? ' · 会话使用中' : ''}</p>
      <button disabled={busy || entry.bare || !!entry.prunable} onClick={() => void open(entry.path)} aria-label={`在工作树开始会话 ${entry.path}`}>在此开始会话</button>
      <button disabled={busy || isProtected(entry.path) || entry.primary || entry.current || entry.bare || !!entry.prunable || entry.locked !== undefined || entry.path.replaceAll('\\', '/').toLowerCase() === root.replaceAll('\\', '/').toLowerCase()} onClick={() => { setRemoving(entry); setError(''); setNotice(''); }} aria-label={`删除工作树 ${entry.path}`}>删除工作树</button>
    </div>)}
  </section>;
}
