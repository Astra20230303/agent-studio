import { useEffect, useRef, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { DesktopState } from './domain';
import './effortPicker.css';

import { effortLevels as levels } from './reasoningEffort';

export function EffortPicker({ model, value, onChange }: { model: string; value: DesktopState['reasoningEffort']; onChange: (value: DesktopState['reasoningEffort']) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const index = Math.max(0, levels.findIndex(level => level.value === value));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="effort-picker" ref={root}>
    <button className="effort-button" aria-label={`推理强度：${levels[index].label}`} aria-expanded={open} onClick={() => setOpen(!open)}>{levels[index].label}<ChevronDown size={13} /></button>
    {open && <div className="effort-popover" role="dialog" aria-label="推理强度">
      <div className="effort-heading"><strong>{levels[index].label}</strong><button aria-label="恢复默认强度" title="恢复模型默认" onClick={() => onChange('default')}><RotateCcw size={16} /></button></div>
      <div className="effort-model" title={model}>{model || '选择模型'}</div>
      <input type="range" min={0} max={levels.length - 1} step={1} value={index} aria-label="推理强度" aria-valuetext={levels[index].label} onChange={event => onChange(levels[Number(event.target.value)].value)} />
      <div className="effort-labels">{levels.map(level => <button key={level.value} aria-pressed={value === level.value} onClick={() => onChange(level.value)}>{level.label}</button>)}</div>
      <p>{levels[index].description}</p>
      <small>实际支持情况取决于模型和渠道；下次发送生效。</small>
    </div>}
  </div>;
}
