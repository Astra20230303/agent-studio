import { useEffect, useRef, useState } from 'react';
import type { Project } from './domain';
type Worktree = { path: string; branch?: string; head?: string; detached?: boolean; bare?: boolean; locked?: string | boolean; prunable?: string | boolean };
export function GitWorktrees({ root, onOpen }: { root: string; onOpen: (project: Project) => void }) {
  const [entries, setEntries] = useState<Worktree[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
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
  const open = async (path: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action: 'open-worktree', path });
      if (!result?.ok) throw Error(result?.error || '无法打开工作树');
      onOpen(result.result);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section aria-label="已有工作树"><h3>已有工作树</h3><button disabled={loading || busy} onClick={() => setRevision(value => value + 1)}>刷新工作树</button>
    {error && <p role="alert">{error}</p>}{loading ? <p>正在读取工作树…</p> : entries.map(entry => <div key={entry.path}>
      <p>{entry.path}</p><p>{entry.bare ? '裸仓库' : entry.branch || `游离 HEAD · ${entry.head?.slice(0, 8) || ''}`}{entry.locked ? ' · 已锁定' : ''}{entry.prunable ? ' · 已失效' : ''}</p>
      <button disabled={busy || entry.bare || !!entry.prunable} onClick={() => void open(entry.path)} aria-label={`在工作树开始会话 ${entry.path}`}>在此开始会话</button>
    </div>)}
  </section>;
}
