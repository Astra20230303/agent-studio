import { useEffect, useRef, useState } from 'react';
import type { ArtifactTarget } from './Artifacts';
import type { FileEditSession } from './WorkspaceFiles';
export function ArtifactPreview({ target, onClose, onEdit }: { target: ArtifactTarget; onClose: () => void; onEdit: (session: FileEditSession) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [preview, setPreview] = useState<any>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let disposed = false; setPreview(undefined); setError('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceFile?.({ root: target.root, path: target.path, action: 'read' });
        if (disposed) return;
        if (!result?.ok) throw Error(result?.error || '无法读取文件');
        setPreview(result.result);
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { disposed = true; };
  }, [target, revision]);
  useEffect(() => { line.current?.scrollIntoView({ block: 'center' }); }, [preview]);
  return <dialog ref={dialog} className="file-editor" aria-label="消息文件预览" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>{target.path}{target.line ? `:${target.line}` : ''}</h2><p>工作区：{target.root}</p>
    {error && <p role="alert">{error}</p>}{!preview && !error && <p>正在读取…</p>}
    {preview?.binary && <p>二进制文件无法预览文本。</p>}{preview?.image && <img src={preview.image} alt={target.path} onError={() => setError('图片无法解码，文件可能已损坏。请修复文件后刷新预览。')} style={{ maxWidth: '100%' }} />}
    {typeof preview?.text === 'string' && <pre style={{ overflow: 'auto', maxHeight: '55vh', whiteSpace: 'pre', margin: '12px 0' }}>{preview.text.split('\n').map((text: string, index: number) => <span key={index} ref={index + 1 === target.line ? line : undefined} style={index + 1 === target.line ? { background: '#ffe08a', color: '#202020' } : undefined}>{text}{'\n'}</span>)}</pre>}
    {preview?.truncated && <p>仅预览前 256 KB。</p>}
    {target.line && typeof preview?.text === 'string' && target.line > preview.text.split('\n').length && <p role="status">第 {target.line} 行不在当前预览范围内。</p>}
    <div><button onClick={() => setRevision(value => value + 1)}>刷新预览</button>{preview?.revision && <button onClick={() => onEdit({ root: target.root, path: target.path, initial: { text: preview.text, revision: preview.revision } })}>编辑此文件</button>}<button onClick={onClose}>关闭预览</button></div>
  </dialog>;
}
