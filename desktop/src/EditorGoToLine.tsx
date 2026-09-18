import { selectEditorLine } from './editorLine';
import { useState, type RefObject } from 'react';
export function EditorGoToLine({ text, editor, disabled }: { text: string; editor: RefObject<HTMLTextAreaElement | null>; disabled: boolean }) {
  const [requested, setRequested] = useState('1');
  const [error, setError] = useState('');
  const lines = text.split('\n');
  return <form aria-label="编辑器行号跳转" onSubmit={event => {
    event.preventDefault();
    if (disabled || !editor.current) return;
    const number = Number(requested);
    if (!/^\d+$/.test(requested) || !Number.isSafeInteger(number) || number < 1 || number > lines.length) { setError(`请输入 1 至 ${lines.length} 的编辑行号。`); return; }
    setError('');
    editor.current.focus(); selectEditorLine(editor.current, number);
  }}><label>行号 <input aria-label="编辑行号" inputMode="numeric" disabled={disabled} value={requested} onChange={event => { setRequested(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} /></label><button disabled={disabled}>跳转到编辑行</button><span>共 {lines.length} 行</span>{error && <p role="alert">{error}</p>}</form>;
}
