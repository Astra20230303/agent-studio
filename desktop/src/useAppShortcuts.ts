import { useEffect } from 'react';

export function useAppShortcuts(actions: { newChat: () => void; search: () => void; composer: () => void }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      if (document.querySelector('[aria-modal="true"]') || (event.target as Element)?.closest?.('.xterm')) return;
      const key = event.key.toLowerCase();
      const action = key === 'k' && !event.shiftKey ? actions.search : event.shiftKey && key === 'o' ? actions.newChat : event.shiftKey && key === 'l' ? actions.composer : undefined;
      if (action) { event.preventDefault(); action(); }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [actions.newChat, actions.search, actions.composer]);
}
