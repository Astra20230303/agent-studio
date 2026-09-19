import { useId, useRef, useState, type ReactNode } from 'react';
export function ConversationPopover({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  const id = useId(); const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return <><button popoverTarget={id} aria-label={label} title={label} aria-expanded={open}>{icon}</button>
    <div ref={panel} id={id} popover="auto" className="conversation-settings" onToggle={event => setOpen(event.newState === 'open')}>
      <div className="conversation-settings-heading"><strong>{label}</strong><button aria-label={`关闭${label}`} onClick={() => panel.current?.hidePopover()}>×</button></div>
      {open && children}
    </div></>;
}
