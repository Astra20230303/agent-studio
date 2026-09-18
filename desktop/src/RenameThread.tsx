import { useEffect, useRef, useState } from 'react';

export function RenameThread({ title, onSave, onClose, subject = '会话', maxLength }: { subject?: '会话' | '终端'; maxLength?: number; title: string; onSave: (title: string) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [name, setName] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!; element.showModal(); input.current?.select();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const save = async () => {
    if (lock.current || !name.trim()) return;
    if (name.trim() === title) { onClose(); return; }
    lock.current = true; setBusy(true); setError('');
    try { await onSave(name.trim()); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="task-modal" aria-label={`重命名${subject}`} onCancel={event => { event.preventDefault(); if (!lock.current) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2>重命名{subject}</h2><input ref={input} aria-label={`${subject}名称`} maxLength={maxLength} value={name} disabled={busy} required onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} />
      {error && <p role="alert">{error}</p>}
      <div className="approval-actions"><button type="button" disabled={busy} onClick={onClose}>取消重命名</button><button disabled={busy || !name.trim()}>{busy ? '正在保存…' : '保存名称'}</button></div>
    </form>
  </dialog>;
}
