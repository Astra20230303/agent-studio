import type { QueuedTurn } from './turnQueue';
import './turnQueue.css';

export function TurnQueue({ items, onRemove, onResume, disabled }: { items: QueuedTurn[]; onRemove: (id: string) => void; onResume: () => void; disabled: boolean }) {
  if (!items.length) return null;
  return <section className="turn-queue" aria-label="待发送消息"><header>待发送 · {items.length}{items.some(item => item.status === 'paused') && <button disabled={disabled} onClick={onResume}>继续队列</button>}</header><ol>{items.map(item => <li key={item.id}><span>{item.text}{item.skills?.map(skill => <small key={skill.path} title={skill.path}>${skill.name}</small>)}{item.attachments?.map(path => <small key={path}>📎 {path.replace(/^.*[\\/]/, '')}</small>)}<small>{item.error || (item.status === 'sending' ? '正在发送…' : '本轮完成后发送')}</small></span><button disabled={item.status === 'sending'} aria-label={`取消排队：${item.text}`} onClick={() => onRemove(item.id)}>取消</button></li>)}</ol></section>;
}
