import { useEffect, useRef, useState } from 'react';
import { CopyText } from './CopyText';
import { indentSelection } from './editorIndent';
import { EditorFind } from './FileEditorFind';
import { editHistory, newEditorHistory, stepHistory } from './editorHistory';
export function FileEditor({ root, path, initial, onClose, onSaved }: { root: string; path: string; initial: { text: string; revision: string }; onClose: () => void; onSaved: (value: any) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const operation = useRef(false);
  const [baseline, setBaseline] = useState(initial);
  const originalText = baseline.text.replace(/\r\n/g, '\n');
  const useCRLF = baseline.text.includes('\r\n') && !baseline.text.replace(/\r\n/g, '').includes('\n');
  const [history, setHistory] = useState(() => newEditorHistory(originalText));
  const composition = useRef<typeof history | null>(null);
  const text = history.text;
  const setText = (value: string) => setHistory(current => editHistory(current, value));
  const navigateHistory = (redo = false) => {
    if (operation.current || composition.current) return;
    setHistory(current => stepHistory(current, redo));
    editor.current?.focus();
  };
  const [finding, setFinding] = useState(false);
  const [tabNavigation, setTabNavigation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = text !== originalText;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const close = () => { if (!busy && (!dirty || window.confirm('放弃未保存的文件修改？'))) onClose(); };
  const reload = async () => {
    if (operation.current || dirty && !window.confirm('放弃当前编辑并重新读取磁盘文件？')) return;
    operation.current = true;
    setBusy(true); setError('');
    try {
      const response = await window.desktop?.workspaceFile?.({ root, path, action: 'read' });
      if (!response?.ok) throw Error(response?.error || '重新读取失败');
      const latest = response.result;
      if (typeof latest?.text !== 'string' || typeof latest.revision !== 'string' || latest.truncated) throw Error('磁盘文件已无法完整编辑，当前编辑内容已保留');
      setBaseline(latest); setHistory(newEditorHistory(latest.text.replace(/\r\n/g, '\n'))); onSaved(latest);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { operation.current = false; setBusy(false); }
  };
  const save = async () => {
    if (operation.current || !dirty) return; operation.current = true; setBusy(true); setError('');
    try {
      const response = await window.desktop?.workspaceFile?.({ root, path, action: 'write', edit: { text: useCRLF ? text.replace(/\n/g, '\r\n') : text, revision: baseline.revision } });
      if (!response?.ok) throw Error(response?.error || '保存不可用');
      onSaved(response.result); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { operation.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} aria-label="编辑工作区文件" className="file-editor" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && ['f', 'h'].includes(event.key.toLowerCase()) && !event.altKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); setFinding(true); requestAnimationFrame(() => dialog.current?.querySelector<HTMLInputElement>('[aria-label="查找编辑内容"]')?.focus()); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !event.altKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); void save(); }
  }} onCancel={event => { event.preventDefault(); close(); }}><h2>{path}</h2><p>编辑工作区：{root}</p><p>Ctrl / ⌘ + S 保存；Tab 缩进，Shift+Tab 取消缩进；Ctrl / ⌘ + M 切换 Tab 焦点导航。</p><button disabled={busy || !history.past.length} onClick={() => navigateHistory()}>撤销编辑</button><button disabled={busy || !history.future.length} onClick={() => navigateHistory(true)}>重做编辑</button><button onClick={() => setFinding(value => !value)}>查找与替换</button>{finding && <EditorFind text={text} onChange={setText} editor={editor} disabled={busy} onClose={() => setFinding(false)} />}<textarea ref={editor} aria-label="文件内容" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.nativeEvent.isComposing && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopPropagation(); navigateHistory(event.key.toLowerCase() === 'y' || event.shiftKey); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') { event.preventDefault(); setTabNavigation(value => !value); return; }
    if (event.key !== 'Tab' || tabNavigation || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing || busy) return;
    event.preventDefault();
    const input = event.currentTarget;
    const next = indentSelection(text, input.selectionStart, input.selectionEnd, event.shiftKey);
    setText(next.text);
    requestAnimationFrame(() => editor.current?.setSelectionRange(next.start, next.end));
  }} spellCheck={false} value={text} disabled={busy} onCompositionStart={() => { composition.current = history; }} onCompositionEnd={event => {
    const before = composition.current; composition.current = null;
    if (before) setHistory(editHistory(before, event.currentTarget.value));
  }} onChange={event => { const value = event.target.value; if (composition.current) setHistory(current => ({ ...current, text: value })); else setText(value); }} /><span role="status">{tabNavigation ? 'Tab 焦点导航已开启' : 'Tab 缩进已开启'}</span>{error && <p role="alert">{error}</p>}<div><CopyText source={text} label="复制编辑内容" /><button disabled={busy} onClick={() => void reload()}>重新读取磁盘文件</button><button disabled={busy} onClick={close}>取消编辑</button><button disabled={busy || !dirty} onClick={() => void save()}>{busy ? '正在保存…' : '保存文件'}</button></div></dialog>;
}
