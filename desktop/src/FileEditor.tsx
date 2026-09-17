import { useEffect, useRef, useState } from 'react';
import { CopyText } from './CopyText';
export function FileEditor({ root, path, initial, onClose, onSaved }: { root: string; path: string; initial: { text: string; revision: string }; onClose: () => void; onSaved: (value: any) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const originalText = initial.text.replace(/\r\n/g, '\n');
  const useCRLF = initial.text.includes('\r\n') && !initial.text.replace(/\r\n/g, '').includes('\n');
  const [text, setText] = useState(originalText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = text !== originalText;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const close = () => { if (!busy && (!dirty || window.confirm('放弃未保存的文件修改？'))) onClose(); };
  const save = async () => {
    if (busy) return; setBusy(true); setError('');
    try {
      const response = await window.desktop?.workspaceFile?.({ root, path, action: 'write', edit: { text: useCRLF ? text.replace(/\n/g, '\r\n') : text, revision: initial.revision } });
      if (!response?.ok) throw Error(response?.error || '保存不可用');
      onSaved(response.result); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} aria-label="编辑工作区文件" className="file-editor" onCancel={event => { event.preventDefault(); close(); }}><h2>{path}</h2><textarea aria-label="文件内容" spellCheck={false} value={text} disabled={busy} onChange={event => setText(event.target.value)} />{error && <p role="alert">{error}</p>}<div><CopyText source={text} label="复制编辑内容" /><button disabled={busy} onClick={close}>取消编辑</button><button disabled={busy || !dirty} onClick={() => void save()}>{busy ? '正在保存…' : '保存文件'}</button></div></dialog>;
}
