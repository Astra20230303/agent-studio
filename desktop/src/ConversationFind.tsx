import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Message } from './domain';
import type { HistoryReadOptions } from './threadHistory';
import './conversation-find.css';
import { canHandleAppShortcut } from './shortcutScope';
import type { ThreadSearchOccurrence } from './threadSearchOccurrences';

export function ConversationFind({ messages, view, searching, loadHistory, searchRemote, disabled, reset = 0 }: { messages: Message[]; view: RefObject<HTMLDivElement | null>; searching: RefObject<boolean>; loadHistory?: (options?: HistoryReadOptions) => Promise<void>; searchRemote?: (term: string, signal: AbortSignal) => Promise<ThreadSearchOccurrence[]>; disabled?: boolean; reset?: number }) {
  const [loading, setLoading] = useState(false);
  const historyRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    setLoading(false); setHistoryStatus('');
    return () => { const request = historyRequest.current; historyRequest.current = undefined; request?.abort(); };
  }, [reset]);
  const [historyStatus, setHistoryStatus] = useState('');
  const load = async () => {
    if (!loadHistory || historyRequest.current || disabled) return;
    const request = new AbortController(); historyRequest.current = request;
    setLoading(true); setHistoryStatus('');
    try {
      await loadHistory({ signal: request.signal, onProgress: ({ pages, items }) => {
        if (historyRequest.current === request && !request.signal.aborted) setHistoryStatus(`已读取 ${pages} 页，${items} 条记录`);
      } });
      if (historyRequest.current === request) setHistoryStatus(request.signal.aborted ? '已取消加载，已有消息保留' : '历史已加载，可查找消息和工具记录');
    } catch (error) {
      if (historyRequest.current === request) setHistoryStatus(request.signal.aborted ? '已取消加载，已有消息保留' : `加载失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (historyRequest.current === request) { historyRequest.current = undefined; setLoading(false); }
    }
  };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [remote, setRemote] = useState<{ query: string; data: ThreadSearchOccurrence[]; error?: string; loading?: boolean }>({ query: '', data: [] });
  useEffect(() => { setOpen(false); setQuery(''); setSelected(undefined); setScope('all'); setRemote({ query: '', data: [] }); }, [reset]);
  const remoteRequest = useRef<AbortController | undefined>(undefined);
  const [remoteTarget, setRemoteTarget] = useState<ThreadSearchOccurrence>();
  const cancelRemote = () => { remoteRequest.current?.abort(); remoteRequest.current = undefined; };
  useEffect(() => { cancelRemote(); setRemoteTarget(undefined); return cancelRemote; }, [query, reset, searchRemote === undefined]);
  const [selected, setSelected] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  useEffect(() => { composing.current = false; }, [open, reset]);

  const term = query.trim().toLocaleLowerCase();
  const matches = term ? messages.filter(message => (scope === 'all' || (message.tool ? scope === 'tool' : message.role === scope)) && [message.content, ...(message.attachments || []), ...(message.skills || []).map(skill => `${skill.name} ${skill.path}`), ...(message.plugins || []).map(plugin => `${plugin.name} ${plugin.id}`), message.tool ? JSON.stringify(message.tool) : ''].join('\n').toLocaleLowerCase().includes(term)) : [];
  const index = Math.max(0, matches.findIndex(message => message.id === selected));
  const targetMessage = remoteTarget && messages.find(message => (message.id === remoteTarget.itemId || message.id === `live-${remoteTarget.itemId}`) && (!message.turnId || message.turnId === remoteTarget.turnId));
  const id = open ? targetMessage?.id || matches[index]?.id : undefined;
  searching.current = open && Boolean(term);
  const close = () => { cancelRemote(); setRemote(current => ({ ...current, loading: false })); setOpen(false); document.getElementById('conversation-find-trigger')?.focus(); };
  const loadRemote = async () => {
    if (!searchRemote || !term || disabled || remoteRequest.current) return;
    const request = new AbortController(); remoteRequest.current = request;
    setRemote({ query: term, data: [], loading: true });
    try {
      const data = await searchRemote(query.trim(), request.signal);
      if (remoteRequest.current === request && !request.signal.aborted) setRemote({ query: term, data });
    } catch (error) {
      if (remoteRequest.current === request && !request.signal.aborted) setRemote({ query: term, data: [], error: error instanceof Error ? error.message : String(error) });
    } finally { if (remoteRequest.current === request) remoteRequest.current = undefined; }
  };
  const locate = async (occurrence: ThreadSearchOccurrence) => {
    if (disabled || loading) return;
    setScope('all'); setRemoteTarget(occurrence);
    if (!messages.some(message => message.id === occurrence.itemId || message.id === `live-${occurrence.itemId}`)) await load();
  };
  const move = (direction: number) => { setRemoteTarget(undefined); if (matches.length) setSelected(matches[(index + direction + matches.length) % matches.length].id); };
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!canHandleAppShortcut(event) || event.shiftKey) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !event.altKey) { event.preventDefault(); setOpen(true); input.current?.focus(); }
    };
    const reveal = () => { setOpen(true); input.current?.focus(); };
    window.addEventListener('felix:conversation-find', reveal);
    window.addEventListener('keydown', listener);
    return () => { window.removeEventListener('felix:conversation-find', reveal); window.removeEventListener('keydown', listener); searching.current = false; };
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
  }, [id, view, messages]);
  return <div className="conversation-find" hidden={!open}>
    {open && loadHistory && <button disabled={loading || disabled} onClick={() => void load()}>{loading ? '正在加载历史…' : '加载完整历史'}</button>}
    {open && loading && <button onClick={() => historyRequest.current?.abort()}>取消加载历史</button>}
    {open && historyStatus && <span role="status">{historyStatus}</span>}
    {open && <><select aria-label="会话查找范围" value={scope} onChange={event => { setScope(event.target.value); setRemoteTarget(undefined); setSelected(undefined); }}><option value="all">全部记录</option><option value="user">我的消息</option><option value="assistant">助手回复</option><option value="tool">工具记录</option></select><input ref={input} type="search" aria-label="查找会话内容" placeholder="查找已加载消息和工具记录" value={query} onChange={event => { setQuery(event.target.value); setSelected(undefined); setRemote({ query: '', data: [] }); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onBlur={() => { composing.current = false; }} onKeyDown={event => {
      if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'Enter') { event.preventDefault(); move(event.shiftKey ? -1 : 1); }
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }} /><span role="status">{term ? matches.length ? `${index + 1} / ${matches.length} 条匹配记录` : '没有匹配记录' : '查找范围：已加载记录'}</span>{searchRemote && term && <button disabled={remote.loading || disabled} onClick={() => void loadRemote()}>{remote.loading ? '正在搜索完整历史…' : '搜索完整历史'}</button>}<button aria-label="上一个匹配" disabled={!matches.length} onClick={() => move(-1)}>↑</button><button aria-label="下一个匹配" disabled={!matches.length} onClick={() => move(1)}>↓</button><button aria-label="关闭会话查找" onClick={close}>×</button>{term && remote.query === term && (remote.error ? <p role="alert">{remote.error}</p> : remote.loading ? <span role="status">正在搜索用户消息和最终回复…</span> : !remote.data.length ? <span role="status">完整历史没有匹配消息</span> : <ol aria-label="完整历史匹配">{remote.data.map((occurrence, index) => <li key={`${occurrence.itemId}-${index}`}><button disabled={disabled || loading} onClick={() => void locate(occurrence)}>{occurrence.snippet.slice(0, occurrence.matchStart)}<mark>{occurrence.snippet.slice(occurrence.matchStart, occurrence.matchEnd)}</mark>{occurrence.snippet.slice(occurrence.matchEnd)}</button></li>)}</ol>)}</>}
  </div>;
}
