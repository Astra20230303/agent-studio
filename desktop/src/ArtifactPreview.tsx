import { parseWorkspaceResult } from './workspaceResponse';
import { useEffect, useRef, useState } from 'react';
import type { ArtifactTarget } from './Artifacts';
import type { FileEditSession } from './WorkspaceFiles';
import { PreviewText, type PreviewTextHandle } from './PreviewText';
import { PreviewImage } from './PreviewImage';
import './artifactPreview.css';
import { isEditablePreview } from './editablePreview';
export function ArtifactPreview({ target, onClose, onEdit }: { target: ArtifactTarget; onClose: () => void; onEdit: (session: FileEditSession) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textPreview = useRef<PreviewTextHandle>(null);
  const [preview, setPreview] = useState<any>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const staleLine = Boolean(target.line && target.revision && preview && target.revision !== preview.revision);
  useEffect(() => {
    const previous = document.activeElement;
    const opened = dialog.current;
    opened?.showModal();
    return () => {
      opened?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    let disposed = false; setPreview(undefined); setError('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceFile?.({ root: target.root, path: target.path, action: 'read' });
        if (disposed) return;
        if (result?.ok !== true) throw Error(result?.error || '无法读取文件');
        setPreview(parseWorkspaceResult(result.result, 'read'));
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { disposed = true; };
  }, [target, revision]);
  return <dialog ref={dialog} className="file-editor file-preview" aria-label="消息文件预览" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ['f', 'g'].includes(event.key.toLowerCase()) && !event.nativeEvent.isComposing && textPreview.current) {
      event.preventDefault(); event.stopPropagation();
      if (event.key.toLowerCase() === 'g') textPreview.current.goToLine(); else textPreview.current.find();
    }
  }} onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>{target.path}{target.line ? `:${target.line}` : ''}</h2><p>工作区：{target.root}</p>
    {error && <p role="alert">{error}</p>}{!preview && !error && <p>正在读取…</p>}
    {preview?.binary && <p>二进制文件无法预览文本。</p>}{preview?.image && <PreviewImage source={preview.image} name={target.path} />}
    {staleLine && <p role="status">文件在搜索后已变化，未定位旧搜索行；请重新搜索或手动跳转。</p>}
    {typeof preview?.text === 'string' && <PreviewText key={revision} ref={textPreview} text={preview.text} lineNumber={staleLine ? undefined : target.line} column={staleLine ? undefined : target.column} matchLength={staleLine ? undefined : target.matchLength} truncated={preview.truncated} />}
    {preview?.truncated && <p role="status">仅预览前 {preview.previewBytes ?? 256 * 1024} 字节，文件共 {preview.size} 字节。末尾不完整的字符已省略，不能编辑截断内容。</p>}
    {preview?.encodingInvalid && <p role="status">文件包含无法按 UTF-8 解码的字符，预览使用替代字符，不能编辑。</p>}
    {!staleLine && target.line && typeof preview?.text === 'string' && target.line > preview.text.split('\n').length && <p role="status">第 {target.line} 行不在当前预览范围内。</p>}
    <div><button onClick={() => setRevision(value => value + 1)}>刷新预览</button>{isEditablePreview(preview) && <button onClick={() => onEdit({ root: target.root, path: target.path, lineNumber: textPreview.current?.currentLine(), initial: { text: preview.text, revision: preview.revision } })}>编辑此文件</button>}<button onClick={onClose}>关闭预览</button></div>
  </dialog>;
}
