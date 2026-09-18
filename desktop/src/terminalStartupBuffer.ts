import type { ValidTerminalEvent } from './terminalEvents';

// Bound pre-acknowledgement storage, including traffic from other terminal tabs.
const MAX_SESSIONS = 64;
const MAX_EVENTS = 1000;
const MAX_CHARACTERS = 1024 * 1024;
export function createTerminalStartupBuffer() {
  const sessions = new Map<string, { events: ValidTerminalEvent[]; exit?: ValidTerminalEvent; truncated: boolean }>();
  let characters = 0;
  let count = 0;
  let overflow = false;
  return {
    push(event: ValidTerminalEvent) {
      let pending = sessions.get(event.id);
      if (!pending) {
        if (sessions.size >= MAX_SESSIONS) { overflow = true; return; }
        pending = { events: [], truncated: false }; sessions.set(event.id, pending);
      }
      if (pending.exit) return;
      if (event.type === 'exit') { pending.exit = { ...event }; return; }
      if (pending.truncated || count >= MAX_EVENTS || characters + event.data.length > MAX_CHARACTERS) { pending.truncated = true; return; }
      pending.events.push({ ...event }); count++; characters += event.data.length;
    },
    drain(id: string) {
      const pending = sessions.get(id);
      const events = pending ? [...pending.events, ...(pending.exit ? [pending.exit] : [])] : [];
      const truncated = overflow || Boolean(pending?.truncated);
      sessions.clear(); characters = 0; count = 0; overflow = false;
      return { events, truncated };
    },
  };
}
