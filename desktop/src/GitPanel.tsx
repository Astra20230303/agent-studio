import { useEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import './workspaceFiles.css';
import { GitReview } from './GitReview';
type ChangedFile = { path: string; original?: string; index: string; working: string; untracked: boolean };
export function GitPanel({ root, onClose, onWorktree, onReview }: { root?: string; onClose: () => void; onWorktree: (project: import('./domain').Project) => void; onReview: (text: string) => void }) {
  const [snapshot, setSnapshot] = useState<{ branch: string; root: string; files: ChangedFile[] }>();
  const [selected, setSelected] = useState<{ path: string; staged: boolean }>();
  const [diff, setDiff] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [branch, setBranch] = useState('codex/');
  const mutate = async (action: string, path?: string) => {
    if (lock.current || !root) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await window.desktop?.workspaceGit?.({ root, action, path, message, branch });
      if (!result?.ok) throw Error(result?.error || 'Git 操作失败');
      if (action === 'create-worktree') { onWorktree(result.result); return; }
      if (action === 'commit') { setMessage(''); setNotice(`已提交 ${result.result.commit.slice(0, 8)}`); }
      setSelected(undefined); setSnapshot(undefined); setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => {
    let disposed = false; setError(''); setDiff(''); setLoading(true);
    if (!root) { setLoading(false); return; }
    void window.desktop?.workspaceGit?.({ root, action: selected ? 'diff' : 'status', ...selected }).then(result => {
      if (disposed) return;
      if (!result?.ok) throw Error(result?.error || '无法读取 Git');
      if (selected) setDiff((result.result.diff || '此区域没有差异。') + (result.result.truncated ? '\n…内容已截断' : ''));
      else setSnapshot(result.result);
    }).catch(error => { if (!disposed) setError(error.message); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [root, selected, revision]);
  return <section className="workspace-files git-panel" aria-label="Git 变更"><header><b>Git 变更</b><button onClick={() => { setSelected(undefined); setSnapshot(undefined); setRevision(value => value + 1); }}>刷新变更</button><button aria-label="关闭 Git 面板" onClick={onClose}>×</button></header><small>{snapshot?.root || root || '请先选择项目目录'}</small>{snapshot && <p>分支：{snapshot.branch}</p>}{error && <p role="alert">{error}</p>}{loading && <p>正在读取…</p>}{selected ? <><button onClick={() => setSelected(undefined)}>返回变更</button><h3>{selected.staged ? '已暂存' : '未暂存'} · {selected.path}</h3>{!loading && !error && <GitReview key={selected.path + selected.staged + revision} root={snapshot?.root || root || ''} path={selected.path} staged={selected.staged} diff={diff} onReview={onReview} />}</> : snapshot?.files.map(file => <div key={file.path}><p>{file.original ? `${file.original} → ` : ''}{file.path}</p>{file.index !== ' ' && !file.untracked && <button onClick={() => setSelected({ path: file.path, staged: true })}>已暂存 {file.index}</button>}{(file.working !== ' ' || file.untracked) && <button onClick={() => setSelected({ path: file.path, staged: false })}>{file.untracked ? '未跟踪' : `未暂存 ${file.working}`}</button>}</div>)}{!selected && snapshot?.files.map(file => <div key={`actions-${file.path}`}><span>{file.path}</span>{(file.untracked || file.working !== ' ') && <button disabled={busy || loading} aria-label={`暂存 ${file.path}`} title="暂存文件" onClick={() => void mutate('stage', file.path)}><Plus size={14} /></button>}{!file.untracked && file.index !== ' ' && <button disabled={busy || loading} aria-label={`取消暂存 ${file.path}`} title="取消暂存" onClick={() => void mutate('unstage', file.path)}><Minus size={14} /></button>}</div>)}{!selected && <form onSubmit={event => { event.preventDefault(); void mutate('commit'); }}><textarea aria-label="提交说明" value={message} disabled={busy} onChange={event => setMessage(event.target.value)} /><button disabled={busy || loading || !message.trim() || !snapshot?.files.some(file => !file.untracked && file.index !== ' ')}>提交已暂存变更</button></form>}{!selected && snapshot && <form onSubmit={event => { event.preventDefault(); void mutate('create-worktree'); }}><label>新工作树分支<input aria-label="新工作树分支" value={branch} disabled={busy} onChange={event => setBranch(event.target.value)} /></label><button disabled={busy || loading || !branch.trim() || branch === 'codex/'}>创建工作树并开始会话</button></form>}{notice && <p role="status">{notice}</p>}{snapshot && !snapshot.files.length && <p>工作区没有变更。</p>}</section>;
}
