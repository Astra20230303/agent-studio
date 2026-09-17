import { GitBranches } from './GitBranches';
import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Download, Upload } from 'lucide-react';
import './workspaceFiles.css';
import { isConflict, conflictPrompt } from './gitConflicts';
import { GitConflictVersions } from './GitConflictVersions';
import { GitReview } from './GitReview';
import { GitHistory } from './GitHistory';
import { GitWorktrees } from './GitWorktrees';
type ChangedFile = { path: string; original?: string; index: string; working: string; untracked: boolean };
export function GitPanel({ root, onClose, onWorktree, onReview }: { root?: string; onClose: () => void; onWorktree: (project: import('./domain').Project) => void; onReview: (text: string) => void }) {
  const [snapshot, setSnapshot] = useState<{ branch: string; branches?: string[]; head?: string; merging?: boolean; root: string; detached?: boolean; stashAvailable?: boolean; remotes?: string[]; upstream?: string; remote?: string; ahead?: number; behind?: number; files: ChangedFile[] }>();
  const [selected, setSelected] = useState<{ path: string; staged: boolean }>();
  const [worktrees, setWorktrees] = useState(false);
  const [history, setHistory] = useState(false);
  const [branches, setBranches] = useState(false);
  const [diff, setDiff] = useState('');
  const [actionError, setActionError] = useState('');
  const [readError, setReadError] = useState('');
  const error = selected ? readError : [actionError, readError].filter(Boolean).join('\n');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [publishRemote, setPublishRemote] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [branch, setBranch] = useState('codex/');
  const [mergeBranch, setMergeBranch] = useState('');
  const mutate = async (action: string, path?: string) => {
    if (lock.current || !root) return;
    lock.current = true; setBusy(true); setActionError(''); setNotice('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action, path, message, branch: action === 'merge-branch' ? mergeBranch : branch, remote: publishRemote, expectedBranch: snapshot?.branch, expectedHead: (snapshot as any)?.head });
      if (!result?.ok) throw Error(result?.error || 'Git 操作失败');
      if (action === 'create-worktree') { onWorktree(result.result); return; }
      if (action === 'pull') setNotice(result.result.changed ? `已从 ${result.result.upstream} 更新到 ${result.result.commit.slice(0, 8)}` : '当前分支已是最新');
      if (action === 'fetch') setNotice('远端信息已更新');
      if ((action === 'push' || action === 'publish')) setNotice(`已推送到 ${result.result.upstream}`);
      if (action === 'commit') { setMessage(''); setNotice(`已提交 ${result.result.commit.slice(0, 8)}`); }
      if (action === 'stash') setNotice('已暂存工作区修改，可随时恢复');
      if (action === 'stash-pop') setNotice('已恢复最近一次工作区暂存');
      if (action === 'merge-branch') setNotice(`已合并 ${mergeBranch}`);
      setSelected(undefined); setSnapshot(undefined); setRevision(value => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : String(error)); if (action === 'merge-branch') { setSelected(undefined); setSnapshot(undefined); setRevision(value => value + 1); } }
    finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => {
    let disposed = false; setReadError(''); setDiff(''); setLoading(true);
    if (!root) { setLoading(false); return; }
    void window.desktop?.workspaceGit?.({ root, action: selected ? 'diff' : 'status', ...selected }).then(result => {
      if (disposed) return;
      if (!result?.ok) throw Error(result?.error || '无法读取 Git');
      if (selected) setDiff((result.result.diff || '此区域没有差异。') + (result.result.truncated ? '\n…内容已截断' : ''));
      else { setSnapshot(result.result); setPublishRemote(current => result.result.remotes?.includes(current) ? current : result.result.remotes?.[0] || ''); }
    }).catch(error => { if (!disposed) setReadError(error.message); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [root, selected, revision]);
  useEffect(() => { setActionError(''); setNotice(''); }, [root]);
  if (branches && root) return <section className="workspace-files git-panel" aria-label="Git 变更"><header><b>Git 分支</b><button disabled={busy} onClick={() => setBranches(false)}>返回 Git 变更</button><button disabled={busy} aria-label="关闭 Git 面板" onClick={onClose}>×</button></header><GitBranches key={root} root={root} onBusyChange={setBusy} onSwitched={branch => { setBranches(false); setSelected(undefined); setSnapshot(undefined); setNotice(`已切换到 ${branch}`); setRevision(value => value + 1); }} /></section>;
  if (worktrees && root) return <section className="workspace-files git-panel" aria-label="Git 变更"><header><b>Git 工作树</b><button onClick={() => setWorktrees(false)}>返回 Git 变更</button><button aria-label="关闭 Git 面板" onClick={onClose}>×</button></header><GitWorktrees key={root} root={root} onOpen={onWorktree} /></section>;
  if (history && root) return <section className="workspace-files git-panel" aria-label="Git 变更"><header><b>Git 提交历史</b><button onClick={() => setHistory(false)}>返回 Git 变更</button><button aria-label="关闭 Git 面板" onClick={onClose}>×</button></header><GitHistory key={root} root={root} /></section>;
  const conflicts = snapshot?.files.filter(isConflict) || [];
  return <section className="workspace-files git-panel" aria-label="Git 变更"><header><b>Git 变更</b><button disabled={!root || busy || loading} onClick={() => setBranches(true)}>切换分支</button><button disabled={!root || busy} onClick={() => setWorktrees(true)}>浏览工作树</button><button disabled={!root} onClick={() => setHistory(true)}>浏览提交历史</button><button onClick={() => { setSelected(undefined); setSnapshot(undefined); setRevision(value => value + 1); }}>刷新变更</button><button aria-label="关闭 Git 面板" onClick={onClose}>×</button></header><small>{snapshot?.root || root || '请先选择项目目录'}</small>{snapshot && <><p>分支：{snapshot.branch}</p>{snapshot.merging && <p role="status">合并尚未完成，请解决并暂存冲突后提交。</p>}<p>{snapshot.upstream ? `上游：${snapshot.upstream} · 领先 ${snapshot.ahead ?? "?"} · 落后 ${snapshot.behind ?? "?"}` : "未配置上游分支"}</p><div><button disabled={busy || loading} onClick={() => void mutate("fetch")}><Download size={14} />获取远端</button><button disabled={busy || loading || !snapshot.upstream || snapshot.remote === "."} onClick={() => void mutate("push")}><Upload size={14} />推送到上游</button><button disabled={busy || loading || !snapshot.upstream || snapshot.remote === "."} onClick={() => void mutate("pull")}>拉取更新（仅快进）</button><button disabled={busy || loading || !snapshot.files.length} onClick={() => void mutate("stash")}>暂存工作区</button><form style={{ display: 'inline-flex', gap: '4px' }} onSubmit={event => { event.preventDefault(); void mutate('merge-branch', mergeBranch); }}><select aria-label="合并本地分支" disabled={busy || loading || snapshot.merging} value={mergeBranch} onChange={event => setMergeBranch(event.target.value)}><option value="">合并本地分支…</option>{snapshot && (snapshot as any).branches?.filter((value: string) => value !== snapshot.branch).map((value: string) => <option key={value} value={value}>{value}</option>)}</select><button disabled={busy || loading || snapshot.merging || !mergeBranch}>合并</button></form><button disabled={busy || loading || !snapshot.stashAvailable} onClick={() => void mutate("stash-pop")}>恢复最近暂存</button></div>{!snapshot.upstream && !snapshot.detached && <form onSubmit={event => { event.preventDefault(); void mutate("publish"); }}><label>发布远端<select aria-label="发布远端" disabled={busy || loading} value={publishRemote} onChange={event => setPublishRemote(event.target.value)}>{!snapshot.remotes?.length && <option value="">尚未配置远端</option>}{snapshot.remotes?.map(remote => <option key={remote} value={remote}>{remote}</option>)}</select></label><p>将发布分支 {snapshot.branch} 并建立上游跟踪。</p><button disabled={busy || loading || !publishRemote}>发布当前分支</button></form>}</>}{snapshot && conflicts.length > 0 && <div role="alert"><p>有 {conflicts.length} 个未解决冲突</p><button disabled={busy || loading} onClick={() => onReview(conflictPrompt(snapshot.root, snapshot.branch, conflicts))}>让 Felix 处理冲突</button></div>}{error && <p role="alert">{error}</p>}{loading && <p>正在读取…</p>}{selected ? <><button onClick={() => setSelected(undefined)}>返回变更</button><h3>{selected.staged ? '已暂存' : '未暂存'} · {selected.path}</h3>{snapshot?.files.some(file => file.path === selected.path && isConflict(file)) && <GitConflictVersions key={selected.path + revision} root={snapshot.root} path={selected.path} />}{!loading && !error && <GitReview key={selected.path + selected.staged + revision} root={snapshot?.root || root || ''} path={selected.path} staged={selected.staged} diff={diff} onReview={onReview} />}</> : snapshot?.files.map(file => <div key={file.path}><p>{file.original ? `${file.original} → ` : ''}{file.path}</p>{isConflict(file) && <strong>未解决冲突 </strong>}{file.index !== ' ' && !file.untracked && !isConflict(file) && <button onClick={() => setSelected({ path: file.path, staged: true })}>已暂存 {file.index}</button>}{(file.working !== ' ' || file.untracked) && <button onClick={() => setSelected({ path: file.path, staged: false })}>{file.untracked ? '未跟踪' : `未暂存 ${file.working}`}</button>}</div>)}{!selected && snapshot?.files.map(file => <div key={`actions-${file.path}`}><span>{file.path}</span>{(file.untracked || file.working !== ' ') && <button disabled={busy || loading} aria-label={isConflict(file) ? `标记已解决 ${file.path}` : `暂存 ${file.path}`} title="暂存文件" onClick={() => void mutate('stage', file.path)}><Plus size={14} /></button>}{!file.untracked && file.index !== ' ' && !isConflict(file) && <button disabled={busy || loading} aria-label={`取消暂存 ${file.path}`} title="取消暂存" onClick={() => void mutate('unstage', file.path)}><Minus size={14} /></button>}</div>)}{!selected && <form onSubmit={event => { event.preventDefault(); void mutate('commit'); }}><textarea aria-label="提交说明" value={message} disabled={busy} onChange={event => setMessage(event.target.value)} /><button disabled={busy || loading || conflicts.length > 0 || !message.trim() || (!snapshot?.merging && !snapshot?.files.some(file => !file.untracked && file.index !== ' '))}>{snapshot?.merging ? '完成合并提交' : '提交已暂存变更'}</button></form>}{!selected && snapshot && <form onSubmit={event => { event.preventDefault(); void mutate('create-worktree'); }}><label>新工作树分支<input aria-label="新工作树分支" value={branch} disabled={busy} onChange={event => setBranch(event.target.value)} /></label><button disabled={busy || loading || !branch.trim() || branch === 'codex/'}>创建工作树并开始会话</button></form>}{notice && <p role="status">{notice}</p>}{snapshot && !snapshot.merging && !snapshot.files.length && <p>工作区没有变更。</p>}</section>;
}


