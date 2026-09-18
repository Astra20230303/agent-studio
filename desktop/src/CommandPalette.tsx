import { useEffect, useRef, useState } from 'react';
import './commandPalette.css';

export type AppCommand = { id: string; label: string; description?: string; keywords: string; run: () => void; disabled?: boolean };
export function CommandPalette({ commands, onClose }: { commands: AppCommand[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const ran = useRef(false);
  const results = commands.filter(command => `${command.label} ${command.description || ''} ${command.keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = Math.max(0, results.findIndex(command => command.id === selectedId));
  const activeId = results[selected]?.id;
  useEffect(() => { setSelectedId(activeId); }, [activeId]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal(); search.current?.focus();
    return () => { element.close(); if (!ran.current && previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { dialog.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [activeId, selected, query]);
  const execute = (command?: AppCommand) => {
    if (!command || command.disabled || ran.current) return;
    ran.current = true; onClose();
    requestAnimationFrame(command.run);
  };
  return <dialog ref={dialog} className="command-palette" aria-label="命令面板" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2>命令面板</h2><button aria-label="关闭命令面板" onClick={onClose}>×</button></header>
    <input ref={search} role="combobox" aria-label="搜索命令" aria-expanded="true" aria-controls="app-command-results" aria-activedescendant={activeId ? `app-command-${activeId}` : undefined} placeholder="搜索操作或已加载会话…" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(undefined); }} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSelectedId(results.length ? results[(selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length].id : undefined); }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setSelectedId(results[event.key === 'Home' ? 0 : results.length - 1]?.id); }
      if (event.key === 'Enter') { event.preventDefault(); execute(results[selected]); }
    }} />
    <div id="app-command-results" role="listbox" aria-label="可用命令">{results.map((command, position) => <button key={command.id} id={`app-command-${command.id}`} role="option" aria-selected={position === selected} aria-disabled={command.disabled || undefined} disabled={command.disabled} tabIndex={-1} onClick={() => execute(command)}><span>{command.label}</span>{command.description && <small className="command-description">{command.description}</small>}</button>)}</div>
    {!results.length && <p role="status">没有匹配的命令</p>}
    <small>↑ ↓ 选择 · Home/End 首尾 · Enter 执行 · Esc 关闭</small>
  </dialog>;
}
