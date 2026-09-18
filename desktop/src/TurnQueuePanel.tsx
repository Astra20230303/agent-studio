import type { QueuedTurn } from './turnQueue';
import { useEffect, useRef, useState } from 'react';
import { Pause, Pencil } from 'lucide-react';
import './turnQueue.css';

export function TurnQueue({ items, onRemove, onResume, onPause, onBeginEdit, onEdit, disabled }: { items: QueuedTurn[]; onRemove: (id: string) => void; onResume: () => void; onPause: () => void; onBeginEdit: (id: string) => boolean; onEdit: (id: string, text: string, attachments: string[]) => boolean; disabled: boolean }) {
  const [editing, setEditing] = useState<QueuedTurn>();
  if (!items.length) return null;
  return <section className="turn-queue" aria-label="待发送消息"><header>待发送 · {items.length}{items.some(item => item.status === 'waiting' || item.status === 'ready') && <button title="暂停队列" aria-label="暂停队列" onClick={onPause}><Pause size={14} /></button>}{items.some(item => item.status === 'paused') && <button disabled={disabled || !!editing} onClick={onResume}>继续队列</button>}</header><ol>{items.map(item => <li key={item.id}><span>{item.text}{item.skills?.map(skill => <small key={skill.path} title={skill.path}>${skill.name}</small>)}{item.attachments?.map(path => <small key={path}>📎 {path.replace(/^.*[\\/]/, '')}</small>)}<small>{item.error || (item.status === 'sending' ? '正在发送…' : '本轮完成后发送')}</small></span><button disabled={item.status === 'sending'} aria-label={`编辑排队消息：${item.text}`} title="编辑排队消息" onClick={() => { if (onBeginEdit(item.id)) setEditing(item); }}><Pencil size={14} /></button><button disabled={item.status === 'sending'} aria-label={`取消排队：${item.text}`} onClick={() => onRemove(item.id)}>取消</button></li>)}</ol>{editing && items.some(item => item.id === editing.id) && <QueueEditor key={editing.id} item={editing} onClose={() => setEditing(undefined)} onSave={(text, attachments) => onEdit(editing.id, text, attachments)} />}</section>;
}

function QueueEditor({ item, onClose, onSave }: { item: QueuedTurn; onClose: () => void; onSave: (text: string, attachments: string[]) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(item.text);
  const [attachments, setAttachments] = useState(item.attachments || []);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="file-editor" aria-label="编辑排队消息" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>编辑排队消息</h2><p>此消息已暂停，保存或取消后可继续队列。</p>
    <textarea autoFocus aria-label="排队消息正文" value={text} onChange={event => setText(event.target.value)} />
    {!!attachments.length && <ul aria-label="排队消息附件">{attachments.map(path => <li key={path}><span title={path}>{path.replace(/^.*[\\\\/]/, '')}</span><button aria-label={`移除排队附件：${path}`} onClick={() => setAttachments(current => current.filter(value => value !== path))}>移除</button></li>)}</ul>}
    {error && <p role="alert">{error}</p>}
    <button onClick={onClose}>取消编辑</button><button disabled={!text.trim() && !attachments.length && !item.skills?.length} onClick={() => { if (onSave(text.trim(), attachments)) onClose(); else setError('消息未保存，请检查队列状态后重试。'); }}>保存排队消息</button>
  </dialog>;
}
