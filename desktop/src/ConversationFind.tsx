import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Message } from './domain';
import './conversation-find.css';

export function ConversationFind({ messages, view, searching, loadHistory, disabled, reset = 0 }: { messages: Message[]; view: RefObject<HTMLDivElement | null>; searching: RefObject<boolean>; loadHistory?: () => Promise<void>; disabled?: boolean; reset?: number }) {
  const [loading, setLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');
  const load = async () => {
    if (!loadHistory || loading || disabled) return;
    setLoading(true); setHistoryStatus('');
    try { await loadHistory(); setHistoryStatus('历史已加载，可查找消息和工具记录'); }
    catch (error) { setHistoryStatus(`加载失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { setOpen(false); setQuery(''); setSelected(undefined); }, [reset]);
  const [selected, setSelected] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const term = query.trim().toLocaleLowerCase();
  const matches = term ? messages.filter(message => [message.content, ...(message.attachments || []), ...(message.skills || []).map(skill => `${skill.name} ${skill.path}`), message.tool ? JSON.stringify(message.tool) : ''].join('\n').toLocaleLowerCase().includes(term)) : [];
  const index = Math.max(0, matches.findIndex(message => message.id === selected));
  const id = open ? matches[index]?.id : undefined;
  searching.current = open && Boolean(term);
  const close = () => { setOpen(false); button.current?.focus(); };
  const move = (direction: number) => { if (matches.length) setSelected(matches[(index + direction + matches.length) % matches.length].id); };
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !event.altKey) { event.preventDefault(); setOpen(true); input.current?.focus(); }
    };
    window.addEventListener('keydown', listener);
    return () => { window.removeEventListener('keydown', listener); searching.current = false; };
  }, [searching]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    const target = [...(view.current?.querySelectorAll<HTMLElement>('[data-message-id]') || [])].find(element => element.dataset.messageId === id);
    if (!target) return;
    target.classList.add('conversation-find-match');
    target.querySelectorAll('details').forEach(element => { element.open = true; });
    let parent = target.parentElement;
    while (parent && parent !== view.current) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    return () => target.classList.remove('conversation-find-match');
  }, [id, view]);
  return <div className="conversation-find">
    <button ref={button} aria-expanded={open} onClick={() => setOpen(value => !value)}>会话内查找</button>
    {open && loadHistory && <button disabled={loading || disabled} onClick={() => void load()}>{loading ? '正在加载历史…' : '加载完整历史'}</button>}
    {open && historyStatus && <span role="status">{historyStatus}</span>}
    {open && <><input ref={input} type="search" aria-label="查找会话内容" placeholder="查找已加载消息和工具记录" value={query} onChange={event => { setQuery(event.target.value); setSelected(undefined); }} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); move(event.shiftKey ? -1 : 1); }
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }} /><span role="status">{term ? matches.length ? `${index + 1} / ${matches.length} 条匹配记录` : '没有匹配记录' : '查找范围：已加载记录'}</span><button aria-label="上一个匹配" disabled={!matches.length} onClick={() => move(-1)}>↑</button><button aria-label="下一个匹配" disabled={!matches.length} onClick={() => move(1)}>↓</button><button aria-label="关闭会话查找" onClick={close}>×</button></>}
  </div>;
}
