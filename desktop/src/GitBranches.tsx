import { useEffect, useRef, useState } from 'react';
import { parseGitBranches, type GitBranchesSnapshot } from './gitBranchesResponse';

export function GitBranches({ root, onSwitched, onBusyChange }: { root: string; onSwitched: (branch: string) => void; onBusyChange: (busy: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<GitBranchesSnapshot>();
  const [target, setTarget] = useState('');
  const [remoteRef, setRemoteRef] = useState('');
  const [localName, setLocalName] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
        const next = parseGitBranches(result.result);
        setSnapshot(next);
        setTarget(value => next.branches.includes(value) ? value : next.current);
        setRemoteRef(value => next.remoteBranches?.some(entry => entry.ref === value) ? value : '');
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { disposed = true; };
  }, [root, revision]);
  const switchBranch = async (mode: 'switch' | 'track' | 'delete' | 'create' = 'switch') => {
    const track = mode === 'track', deleting = mode === 'delete', creating = mode === 'create';
    const remote = snapshot?.remoteBranches?.find(entry => entry.ref === remoteRef);
    if (locked.current || !snapshot || (creating ? !snapshot.head || !newName.trim() || snapshot.branches.includes(newName) : deleting ? !deleteName : track ? !remote || !localName.trim() : !target)) return;
    locked.current = true; setBusy(true); onBusyChange(true); setError(''); setNotice('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action: creating ? 'create-branch' : deleting ? 'delete-branch' : track ? 'track-branch' : 'switch-branch', branch: creating ? newName : deleting ? deleteName : track ? localName : target, expectedBranch: snapshot.current, expectedHead: snapshot.head, ...(track ? { ref: remote!.ref, expectedRemoteHead: remote!.head } : {}) });
      if (!mounted.current) return;
      if (!result?.ok) throw Error(result?.error || '无法切换分支');
      if (deleting) { setRevision(value => value + 1); setDeleteName(''); setError(''); setNotice(`已删除本地分支 ${deleteName}`); } else onSwitched(result.result.branch);
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; onBusyChange(false); if (mounted.current) setBusy(false); }
  };
  return <section aria-label="切换本地分支">
    <h3>切换本地分支</h3>
    {snapshot && <p>当前：{snapshot.current || `游离 HEAD ${snapshot.head.slice(0, 8)}`}</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!snapshot && !error && <p role="status">正在读取分支…</p>}
    <button disabled={busy} onClick={() => setRevision(value => value + 1)}>刷新分支列表</button>
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch(); }}>
      <label>目标分支<select aria-label="目标分支" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}><option value="">选择本地分支</option>{snapshot.branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}</select></label>
      <p>未提交修改会随工作区保留；若目标分支会覆盖修改，Git 将拒绝切换。</p>
      <button disabled={busy || !target || target === snapshot.current}>{busy ? '正在切换…' : '切换到所选分支'}</button>
    </form>}
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch('create'); }}>
      <h3>从当前提交创建本地分支</h3>
      <label>新分支名称<input aria-label="新分支名称" value={newName} disabled={busy} onChange={event => setNewName(event.target.value)} /></label>
      {!snapshot.head && <p>请先完成首个提交，再创建本地分支。</p>}
      {newName && snapshot.branches.includes(newName) && <p>本地分支已存在，请选择其他名称。</p>}
      <p>创建后立即切换，保留当前未提交修改。</p>
      <button disabled={busy || !snapshot.head || !newName.trim() || snapshot.branches.includes(newName)}>创建本地分支并切换</button>
    </form>}
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch('track'); }}>
      <h3>从远端分支创建本地分支</h3>
      <p>显示上次获取的远端分支；可返回 Git 变更获取最新远端信息。</p>
      {!snapshot.remoteBranches?.length && <p role="status">暂无已获取的远端分支。请先配置远端并获取远端信息。</p>}
      <label>远端分支<select aria-label="远端分支" value={remoteRef} disabled={busy} onChange={event => setRemoteRef(event.target.value)}><option value="">选择远端分支</option>{snapshot.remoteBranches?.map(entry => <option key={entry.ref} value={entry.ref}>{entry.ref.slice(13)}</option>)}</select></label>
      <label>本地分支名称<input aria-label="本地分支名称" value={localName} disabled={busy} onChange={event => setLocalName(event.target.value)} /></label>
      {localName && snapshot.branches.includes(localName) && <p>本地分支已存在，请选择其他名称。</p>}
      <p>创建后立即切换，并将所选远端分支设为拉取和推送的上游。</p>
      <button disabled={busy || !remoteRef || !localName.trim() || snapshot.branches.includes(localName)}>创建跟踪分支并切换</button>
    </form>}
    {snapshot && <form onSubmit={event => { event.preventDefault(); void switchBranch('delete'); }}>
      <h3>删除已合并本地分支</h3>
      <label>本地分支<select aria-label="删除本地分支" value={deleteName} disabled={busy} onChange={event => setDeleteName(event.target.value)}><option value="">选择分支</option>{snapshot.branches.filter(branch => branch !== snapshot.current).map(branch => <option key={branch} value={branch}>{branch}</option>)}</select></label>
      <p>仅删除已合并分支；当前分支和含未合并提交的分支会被 Git 拒绝。</p>
      <button disabled={busy || !deleteName}>删除本地分支</button>
    </form>}
  </section>;
}
