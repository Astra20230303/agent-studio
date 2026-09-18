import { useEffect, useId, useRef, useState } from 'react';
import './appMenus.css';

type MenuAction = { label: string; run: () => void; disabled?: boolean };
export function AppMenus({ groups }: { groups: { label: string; actions: MenuAction[] }[] }) {
  return <nav aria-label="应用菜单"><span className="app-menus-wide">{groups.map(group => <AppMenu key={group.label} {...group} />)}</span><span className="app-menus-compact"><AppMenu label="菜单" actions={groups.flatMap(group => group.actions.map(action => ({ ...action, label: `${group.label} · ${action.label}` })))} /></span></nav>;
}
function AppMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { const resize = () => menu.current?.hidePopover(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const items = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
  const show = (last = false) => {
    const element = menu.current;
    if (!element || !trigger.current) return;
    element.showPopover();
    const rect = trigger.current.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - element.offsetWidth - 8))}px`;
    element.style.top = `${rect.bottom + 4}px`;
    const choices = items();
    (last ? choices.at(-1) : choices[0])?.focus();
  };
  const close = () => { menu.current?.hidePopover(); trigger.current?.focus(); };
  return <>
    <button ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : show()}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(event.key === 'ArrowUp'); }
      }}>{label}</button>
    <div ref={menu} id={id} popover="auto" role="menu" aria-label={label} className="app-menu-popup"
      onToggle={event => setOpen(event.newState === 'open')}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key === 'Tab') { menu.current?.hidePopover(); return; }
        const choices = items();
        const current = choices.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? (current + 1) % choices.length
          : event.key === 'ArrowUp' ? (current - 1 + choices.length) % choices.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : undefined;
        if (next !== undefined) { event.preventDefault(); choices[next]?.focus(); }
      }}>
      {actions.map(action => <button key={action.label} role="menuitem" disabled={action.disabled} tabIndex={-1} onClick={() => {
        close(); requestAnimationFrame(action.run);
      }}>{action.label}</button>)}
    </div>
  </>;
}
