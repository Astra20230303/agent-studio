import { useEffect, useRef, useState } from 'react';

export function GitBranches({ root, onSwitched, onBusyChange }: { root: string; onSwitched: (branch: string) => void; onBusyChange: (busy: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<{ branches: string[]; remoteBranches?: { ref: string; head: string }[]; current: string; head: string }>();
  const [target, setTarget] = useState('');
  const [remoteRef, setRemoteRef] = useState('');
  const [localName, setLocalName] = useState('');
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
        setRemoteRef(value => result.result.remoteBranches?.some((entry: { ref: string }) => entry.ref === value) ? value : '');
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { disposed = true; };
  }, [root, revision]);
  const switchBranch = async (track = false) => {
    const remote = snapshot?.remoteBranches?.find(entry => entry.ref === remoteRef);
    if (locked.current || !snapshot || (track ? !remote || !localName.trim() : !target)) return;
    locked.current = true; setBusy(true); onBusyChange(true); setError('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action: track ? 'track-branch' : 'switch-branch', branch: track ? localName : target, expectedBranch: snapshot.current, expectedHead: snapshot.head, ...(track ? { ref: remote!.ref, expectedRemoteHead: remote!.head } : {}) });
      if (!mounted.current) return;
      if (!result?.ok) throw Error(result?.error || '无法切换分支');
      onSwitched(result.result.branch);
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; onBusyChange(false); if (mounted.current) setBusy(false); }
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
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch(true); }}>
      <h3>从远端分支创建本地分支</h3>
      <p>显示上次获取的远端分支；可返回 Git 变更获取最新远端信息。</p>
      <label>远端分支<select aria-label="远端分支" value={remoteRef} disabled={busy} onChange={event => setRemoteRef(event.target.value)}><option value="">选择远端分支</option>{snapshot.remoteBranches?.map(entry => <option key={entry.ref} value={entry.ref}>{entry.ref.slice(13)}</option>)}</select></label>
      <label>本地分支名称<input aria-label="本地分支名称" value={localName} disabled={busy} onChange={event => setLocalName(event.target.value)} /></label>
      {localName && snapshot.branches.includes(localName) && <p>本地分支已存在，请选择其他名称。</p>}
      <p>创建后立即切换，并将所选远端分支设为拉取和推送的上游。</p>
      <button disabled={busy || !remoteRef || !localName.trim() || snapshot.branches.includes(localName)}>创建跟踪分支并切换</button>
    </form>}
  </section>;
}
