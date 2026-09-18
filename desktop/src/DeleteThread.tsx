import { useEffect, useRef, useState } from 'react';

export function DeleteThread({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal(); cancel.current?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const confirm = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onConfirm(); onCancel(); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="task-modal" role="alertdialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" aria-busy={busy} onCancel={event => { event.preventDefault(); if (!lock.current) onCancel(); }}>
    <h2 id="delete-dialog-title">删除会话？</h2>
    <p id="delete-dialog-description">“{title}”将被永久删除，此操作无法撤销。</p>
    {error && <p role="alert">{error}</p>}
    <div className="confirm-actions"><button ref={cancel} disabled={busy} onClick={onCancel}>取消</button><button className="danger" disabled={busy} onClick={() => void confirm()}>{busy ? '正在删除…' : '删除'}</button></div>
  </dialog>;
}
