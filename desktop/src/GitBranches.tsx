import { useEffect, useRef, useState } from 'react';

export function GitBranches({ root, onSwitched }: { root: string; onSwitched: (branch: string) => void }) {
  const [snapshot, setSnapshot] = useState<{ branches: string[]; current: string; head: string }>();
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let disposed = false; setSnapshot(undefined); setError('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceGit?.({ root, action: 'branches' });
        if (disposed) return;
        if (!result?.ok) throw Error(result?.error || '无法读取分支');
        setSnapshot(result.result);
        setTarget(value => result.result.branches.includes(value) ? value : result.result.current);
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { disposed = true; };
  }, [root, revision]);
  const switchBranch = async () => {
    if (locked.current || !snapshot || !target) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action: 'switch-branch', branch: target, expectedBranch: snapshot.current, expectedHead: snapshot.head });
      if (!mounted.current) return;
      if (!result?.ok) throw Error(result?.error || '无法切换分支');
      onSwitched(result.result.branch);
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  return <section aria-label="切换本地分支">
    <h3>切换本地分支</h3>
    {snapshot && <p>当前：{snapshot.current || `游离 HEAD ${snapshot.head.slice(0, 8)}`}</p>}
    {error && <p role="alert">{error}</p>}
    {!snapshot && !error && <p role="status">正在读取分支…</p>}
    <button disabled={busy} onClick={() => setRevision(value => value + 1)}>刷新分支列表</button>
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch(); }}>
      <label>目标分支<select aria-label="目标分支" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}><option value="">选择本地分支</option>{snapshot.branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}</select></label>
      <p>未提交修改会随工作区保留；若目标分支会覆盖修改，Git 将拒绝切换。</p>
      <button disabled={busy || !target || target === snapshot.current}>{busy ? '正在切换…' : '切换到所选分支'}</button>
    </form>}
  </section>;
}
