import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, RefreshCw } from 'lucide-react';

export function useModelCatalog(providerId?: string) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    setLoading(true);
    setModels([]);
    setError('');
    try {
      const result = await window.desktop?.listModels?.(providerId ? { providerId } : undefined);
      if (revision !== generation.current) return;
      if (!result?.ok || !result.models?.length) throw new Error(result?.error || '无法获取模型列表。');
      setModels(result.models);
    } catch (err) {
      if (revision !== generation.current) return;
      setModels([]);
      setError(err instanceof Error ? err.message : '无法获取模型列表。');
    } finally { if (revision === generation.current) setLoading(false); }
  }, [providerId]);
  useEffect(() => { const changed = () => { void refresh(); }; changed(); window.addEventListener('provider-changed', changed); return () => { generation.current++; window.removeEventListener('provider-changed', changed); }; }, [refresh]);
  return { models, loading, error, refresh };
}

export function ModelPicker({ catalog, selected, onSelect, open, setOpen }: {
  catalog: ReturnType<typeof useModelCatalog>; selected: string; onSelect: (id: string) => void;
  open: boolean; setOpen: (value: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState<string>();
  const listId = useId();
  const search = useRef<HTMLInputElement>(null);
  const visible = catalog.models.filter(id => id.toLowerCase().includes(query.trim().toLowerCase()));
  const index = Math.max(0, visible.indexOf(highlighted || selected));
  const active = !catalog.loading && !catalog.error ? visible[index] : undefined;
  const choose = (id: string) => { onSelect(id); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.model-button')?.focus(); };
  useEffect(() => { if (open) { setQuery(''); setHighlighted(undefined); search.current?.focus(); } }, [open]);
  useEffect(() => { if (open && active) document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: 'nearest' }); }, [open, active, index, listId]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.isComposing && event.keyCode !== 229 && !event.defaultPrevented) { event.preventDefault(); setOpen(false); root.current?.querySelector<HTMLButtonElement>('.model-button')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open, setOpen]);
  return <div className="model-picker" ref={root}>
    <button className="model-button" aria-label="选择模型" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{catalog.loading ? '加载模型…' : catalog.models.includes(selected) ? selected : selected ? `${selected}（不可用）` : '选择模型'}</span><ChevronDown size={13} />
    </button>
    {open && <div className="floating-menu model-catalog" aria-label="Provider 模型">
      <div className="model-catalog-header"><span>Provider</span><button type="button" title="刷新模型列表" aria-label="刷新模型列表" disabled={catalog.loading} onClick={() => void catalog.refresh()}><RefreshCw size={14} /></button></div>
      <input ref={search} role="combobox" aria-label="搜索模型" aria-expanded="true" aria-controls={listId} aria-activedescendant={active ? `${listId}-${index}` : undefined} placeholder="搜索模型 ID…" value={query} onChange={event => { setQuery(event.target.value); setHighlighted(undefined); }} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) event.preventDefault();
        if (!active) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setHighlighted(visible[(index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length]);
        if (event.key === 'Enter') choose(active);
      }} style={{ boxSizing: 'border-box', width: '100%', minWidth: 0 }} />
      {catalog.loading ? <p role="status">正在获取模型…</p> : catalog.error ? <p role="alert">{catalog.error}</p> :
        <div className="model-options" id={listId} role="listbox" aria-label="可用模型">{visible.map((id, position) => <button key={id} id={`${listId}-${position}`} role="option" aria-selected={active === id} aria-pressed={selected === id} style={active === id ? { outline: '2px solid #b88712', outlineOffset: '-2px' } : undefined} onClick={() => choose(id)}><span>{id}</span>{selected === id && <Check size={14} />}</button>)}{!visible.length && <p role="status">没有匹配的模型</p>}</div>}
    </div>}
  </div>;
}
