import { effortLevels, unsupportedEffort } from './reasoningEffort';
import type { useModelCatalog } from './ModelPicker';
type QueueConfiguration = Pick<QueuedTurn, 'model' | 'effort' | 'planningMode' | 'skills' | 'plugins'>;
type QueueCatalog = Pick<ReturnType<typeof useModelCatalog>, 'models' | 'efforts' | 'loading' | 'error'>;
import { queueMoveTarget, type QueuedTurn } from './turnQueue';
import { useEffect, useRef, useState } from 'react';
import { Pause, Pencil } from 'lucide-react';
import './turnQueue.css';

export function TurnQueue({ items, onRemove, onResume, onPause, onBeginEdit, onEdit, onMove, disabled, catalog }: { catalog?: QueueCatalog; items: QueuedTurn[]; onRemove: (id: string) => void; onResume: () => void; onPause: () => void; onBeginEdit: (id: string) => boolean; onEdit: (id: string, text: string, attachments: string[], configuration: QueueConfiguration) => boolean; onMove: (id: string, direction: -1 | 1) => void; disabled: boolean }) {
  const [editingId, setEditingId] = useState<string>();
  const editing = items.find(item => item.id === editingId && item.status === 'paused');
  useEffect(() => { if (editingId && !editing) setEditingId(undefined); }, [editingId, editing]);
  if (!items.length) return null;
  return <section className="turn-queue" aria-label="待发送消息"><header>待发送 · {items.length}{items.some(item => item.status === 'waiting' || item.status === 'ready') && <button title="暂停队列" aria-label="暂停队列" onClick={onPause}><Pause size={14} /></button>}{items.some(item => item.status === 'paused') && <button disabled={disabled || !!editing} onClick={onResume}>继续队列</button>}</header><ol>{items.map(item => <li key={item.id}><span>{item.text}<small aria-label="排队执行配置">{item.model} · {effortLevels.find(level => level.value === item.effort)?.label || item.effort} · {item.planningMode === 'plan' ? '先规划' : '直接执行'}</small>{item.skills?.map(skill => <small key={skill.path} title={skill.path}>${skill.name}</small>)}{item.plugins.map(plugin => <small key={plugin.id} title={`plugin://${plugin.id}`}>插件：{plugin.name}</small>)}{item.attachments?.map(path => <small key={path}>📎 {path.replace(/^.*[\\/]/, '')}</small>)}<small>{item.error || (item.status === 'sending' ? '正在发送…' : '本轮完成后发送')}</small></span>{([-1, 1] as const).map(direction => <button key={direction} disabled={!!editing || queueMoveTarget(items, item.id, direction) < 0} title="暂停队列后调整发送顺序" aria-label={`${direction === -1 ? '上移' : '下移'}排队消息：${item.text}`} onClick={() => onMove(item.id, direction)}>{direction === -1 ? '↑' : '↓'}</button>)}<button disabled={item.status === 'sending'} aria-label={`编辑排队消息：${item.text}`} title="编辑排队消息" onClick={() => { if (onBeginEdit(item.id)) setEditingId(item.id); }}><Pencil size={14} /></button><button disabled={item.status === 'sending'} aria-label={`取消排队：${item.text}`} onClick={() => onRemove(item.id)}>取消</button></li>)}</ol>{editing && <QueueEditor key={editing.id} item={editing} catalog={catalog} onClose={() => setEditingId(undefined)} onSave={(text, attachments, configuration) => onEdit(editing.id, text, attachments, configuration)} />}</section>;
}

function QueueEditor({ item, onClose, onSave, catalog }: { catalog?: QueueCatalog; item: QueuedTurn; onClose: () => void; onSave: (text: string, attachments: string[], configuration: QueueConfiguration) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(item.text);
  const [attachments, setAttachments] = useState(item.attachments || []);
  const [skills, setSkills] = useState(item.skills || []);
  const [plugins, setPlugins] = useState(item.plugins);
  const [model, setModel] = useState(item.model);
  const [effort, setEffort] = useState(item.effort);
  const [planningMode, setPlanningMode] = useState<'default' | 'plan'>(item.planningMode || 'default');
  const models = catalog?.models ?? [item.model];
  const supported = catalog?.efforts[model];
  const levels = effortLevels.filter(level => level.value === 'default' || supported === undefined || supported.includes(level.value));
  const configurationChanged = model !== item.model || effort !== item.effort;
  const invalidConfiguration = configurationChanged && (catalog?.loading || !models.includes(model) || unsupportedEffort(effort, supported) || !effortLevels.some(level => level.value === effort));
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="file-editor" aria-label="编辑排队消息" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>编辑排队消息</h2><p>此消息已暂停，保存或取消后可继续队列。</p>
    <textarea autoFocus aria-label="排队消息正文" value={text} onChange={event => setText(event.target.value)} />
    <label>模型<select aria-label="排队消息模型" value={model} disabled={catalog?.loading} onChange={event => setModel(event.target.value)}>
      {!models.includes(model) && <option value={model} disabled>{model}（不可用）</option>}{models.map(id => <option key={id}>{id}</option>)}
    </select></label>
    <label>推理强度<select aria-label="排队消息推理强度" value={effort} onChange={event => setEffort(event.target.value)}>
      {!levels.some(level => level.value === effort) && <option value={effort} disabled>{effort}（未确认支持）</option>}{levels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
    </select></label>
    <label>执行模式<select aria-label="排队消息执行模式" value={planningMode} onChange={event => setPlanningMode(event.target.value as 'default' | 'plan')}><option value="default">直接执行</option><option value="plan">先规划</option></select></label>
    <p>仅应用于此排队消息，不改变会话默认配置。</p>
    {invalidConfiguration && <p role="status">请等待模型目录加载，并选择可用模型及支持的推理强度。</p>}
    {catalog?.error && <p role="status">{catalog.error} 仍可保留原配置修改正文。</p>}
    {!!attachments.length && <ul aria-label="排队消息附件">{attachments.map(path => <li key={path}><span title={path}>{path.replace(/^.*[\\/]/, '')}</span><button aria-label={`移除排队附件：${path}`} onClick={() => setAttachments(current => current.filter(value => value !== path))}>移除</button></li>)}</ul>}
    {!!skills.length && <ul aria-label="排队消息技能">{skills.map(skill => <li key={skill.path}><span title={skill.path}>${skill.name}</span><button aria-label={`移除排队技能：${skill.path}`} onClick={() => setSkills(current => current.filter(value => value.path !== skill.path))}>移除</button></li>)}</ul>}
    {!!plugins.length && <ul aria-label="排队消息插件">{plugins.map(plugin => <li key={plugin.id}><span title={`plugin://${plugin.id}`}>{plugin.name}</span><button aria-label={`移除排队插件：${plugin.id}`} onClick={() => setPlugins(current => current.filter(value => value.id !== plugin.id))}>移除</button></li>)}</ul>}
    {error && <p role="alert">{error}</p>}
    <button onClick={onClose}>取消编辑</button><button disabled={Boolean(invalidConfiguration) || !text.trim() && !attachments.length && !skills.length} onClick={() => { if (invalidConfiguration) return; if (onSave(text.trim(), attachments, { model, effort, planningMode, skills, plugins })) onClose(); else setError('消息未保存，请检查队列状态后重试。'); }}>保存排队消息</button>
  </dialog>;
}
