import { useEffect, useState, type ReactNode } from 'react';
import type { ToolActivity } from './domain';
import './artifacts.css';

export function ArtifactLink({ path, label, preview = false, children }: { path: string; label: string; preview?: boolean; children?: ReactNode }) {
  const [file, setFile] = useState<{ name: string; data: string; image: boolean }>();
  const [error, setError] = useState('');
  const remote = /^https?:\/\//i.test(path);
  useEffect(() => {
    if (remote) return;
    let active = true;
    setFile(undefined); setError('');
    window.desktop?.artifact?.({ path, action: 'read' }).then(result => {
      if (!active) return;
      if (result?.ok) setFile(result.result); else setError(result?.error || '无法读取文件');
    }).catch(error => { if (active) setError(String(error)); });
    return () => { active = false; };
  }, [path, remote]);
  if (remote) return preview ? <img className="artifact-image" src={path} alt={label} /> : <a href={path} target="_blank" rel="noreferrer">{children || label}</a>;
  return <span className="artifact-link">
    {file?.image && (preview || !/下载|download/i.test(label)) && <img className="artifact-image" src={file.data} alt={label} />}
    {file ? <a download={file.name} href={file.data}>↓ {preview ? `下载 ${file.name}` : children || label}</a> : <span title={path}>{error || `正在读取 ${label}…`}</span>}
  </span>;
}

export function FileChangeCard({ change, applied }: { change: NonNullable<ToolActivity['changes']>[number]; applied: boolean }) {
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState('');
  const lines = change.diff?.split('\n') || [];
  const added = lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
  const removed = lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
  const kind = typeof change.kind === 'string' ? change.kind : change.kind?.type;
  const undo = async () => {
    setBusy(true); setError('');
    try { const result = await window.desktop?.artifact?.({ action: 'undo', change }); if (!result?.ok) throw Error(result?.error || '无法撤销'); setUndone(true); setConfirm(false); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <section className="artifact-change">
    <div className="artifact-change-bar"><span className="artifact-file-icon">▧</span><div className="artifact-file-title"><b>{undone ? '已撤销' : !applied ? '文件变更' : kind === 'add' ? '已创建' : kind === 'delete' ? '已删除' : '已编辑'} {change.path.split(/[\\/]/).at(-1)}</b><span className="diff-count"><em>+{added}</em> <b>-{removed}</b></span></div>
      <button disabled={!applied || !change.diff || busy || undone} onClick={() => setConfirm(!confirm)}>撤销 ↶</button><button aria-expanded={review} onClick={() => setReview(!review)}>审核</button></div>
    {confirm && <div className="artifact-confirm">撤销这次文件变更？<button disabled={busy} onClick={() => void undo()}>{busy ? '撤销中…' : '确认撤销'}</button><button disabled={busy} onClick={() => setConfirm(false)}>取消</button></div>}
    {error && <p role="alert">{error}</p>}
    {review && <div className="artifact-review"><small>{change.path}</small><pre>{lines.length ? lines.map((line, i) => <span key={i} className={line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : ''}>{line}{'\n'}</span>) : '未提供差异内容'}</pre></div>}
  </section>;
}
