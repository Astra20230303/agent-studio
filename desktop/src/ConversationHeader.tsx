import { ConversationPopover } from './ConversationPopover';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X, Monitor, MoreHorizontal } from 'lucide-react';
import './conversation-header.css';

export function ConversationHeader({ title, children, environment, actions }: { title: string; children: ReactNode; environment?: ReactNode; actions?: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return <header className="conversation-header">
    <span className="conversation-title" title={title}>{title}</span>
    <div className="conversation-header-actions">{actions && <ConversationPopover keepMounted label="更多会话操作" icon={<MoreHorizontal size={17} />}>{actions}</ConversationPopover>}{environment && <ConversationPopover label="会话环境" icon={<Monitor size={17} />}>{environment}</ConversationPopover>}
      <button id="conversation-find-trigger" aria-label="会话内查找" title="会话内查找 (Ctrl/⌘ F)" onClick={() => window.dispatchEvent(new Event('felix:conversation-find'))}><Search size={17} /></button>
      <button popoverTarget={id} aria-label="会话设置" title="会话设置" aria-expanded={open}><SlidersHorizontal size={17} /></button>
    </div>
    <div ref={panel} id={id} popover="auto" className="conversation-settings" onToggle={event => setOpen(event.newState === 'open')}>
      <div className="conversation-settings-heading"><strong>会话设置</strong><button aria-label="关闭会话设置" onClick={() => panel.current?.hidePopover()}><X size={16} /></button></div>
      {children}
    </div>
  </header>;
}
