import { useEffect } from 'react';
import { canHandleAppShortcut } from './shortcutScope';

export function useAppShortcuts(actions: { files: () => void; palette: () => void; newChat: () => void; search: () => void; composer: () => void }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (!canHandleAppShortcut(event)) return;
      const key = event.key.toLowerCase();
      const action = key === 'p' ? event.shiftKey ? actions.palette : actions.files : key === 'k' && !event.shiftKey ? actions.search : event.shiftKey && key === 'o' ? actions.newChat : event.shiftKey && key === 'l' ? actions.composer : undefined;
      if (action) { event.preventDefault(); action(); }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [actions.files, actions.palette, actions.newChat, actions.search, actions.composer]);
}
