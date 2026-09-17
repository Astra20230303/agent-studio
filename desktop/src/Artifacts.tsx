import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ToolActivity } from './domain';
import './artifacts.css';
import { messageLinkKind } from './messageLink';
export const ArtifactWorkspaceContext = createContext<string | undefined>(undefined);

export function ArtifactLink({ path, label, preview = false, children }: { path: string; label: string; preview?: boolean; children?: ReactNode }) {
  const root = useContext(ArtifactWorkspaceContext);
  const [file, setFile] = useState<{ name: string; data: string; image: boolean }>();
  const [error, setError] = useState('');
  const kind = messageLinkKind(path);
  const version = useRef(0);
  useEffect(() => {
    version.current++;
    setFile(undefined); setError('');
    if (kind !== 'file') return () => { version.current++; };
    let active = true;
    window.desktop?.artifact?.({ root, path, action: 'read' }).then(result => {
      if (!active) return;
      if (result?.ok) setFile(result.result); else setError(result?.error || '无法读取文件');
    }).catch(error => { if (active) setError(String(error)); });
    return () => { active = false; version.current++; };
  }, [path, kind, root]);
  if (kind === 'unsupported') return <span title={`不支持的链接：${path}`}>{children || label}</span>;
  if (kind === 'anchor') return <><a href={path} onClick={event => {
    event.preventDefault();
    let name: string;
    try { name = decodeURIComponent(path.slice(1)); } catch { setError('无效的章节链接'); return; }
    const scope = event.currentTarget.closest('.markdown-content');
    const target = Array.from(scope?.querySelectorAll<HTMLElement>('[data-markdown-anchor]') || []).find(element => element.dataset.markdownAnchor === name);
    if (target) { setError(''); target.scrollIntoView({ block: 'start' }); target.focus({ preventScroll: true }); }
    else setError('此消息中未找到对应章节');
  }}>{children || label}</a>{error && <small role="status">{error}</small>}</>;
  if (kind === 'web') return preview ? <img className="artifact-image" src={path} alt={label} /> : <><a href={path} target="_blank" rel="noreferrer" onClick={event => {
    if (!window.desktop?.openExternal) return;
    event.preventDefault(); setError(''); const requestVersion = version.current;
    void window.desktop.openExternal(path).catch(() => { if (requestVersion === version.current) setError('无法打开链接，请重试'); });
  }}>{children || label}</a>{error && <small role="status">{error}</small>}</>;
  return <span className="artifact-link">
    {file?.image && (preview || !/下载|download/i.test(label)) && <img className="artifact-image" src={file.data} alt={label} />}
    {file ? <a download={file.name} href={file.data}>↓ {preview ? `下载 ${file.name}` : children || label}</a> : <span title={path}>{error || `正在读取 ${label}…`}</span>}
  </span>;
}

export function FileChangeCard({ change, applied }: { change: NonNullable<ToolActivity['changes']>[number]; applied: boolean }) {
  const root = useContext(ArtifactWorkspaceContext);
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
    try { const result = await window.desktop?.artifact?.({ root, action: 'undo', change }); if (!result?.ok) throw Error(result?.error || '无法撤销'); setUndone(true); setConfirm(false); }
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
