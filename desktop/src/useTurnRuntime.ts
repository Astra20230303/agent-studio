import { useCallback, useRef, useState } from 'react';
import { reduceTurn } from './turnRuntime';
import type { TurnEvent, TurnRuntime } from './turnRuntime';

export function useTurnRuntime() {
  const ref = useRef<Record<string, TurnRuntime>>({});
  const [threads, setThreads] = useState(ref.current);
  const apply = useCallback((threadId: string, event: TurnEvent) => {
    if (!threadId) return;
    ref.current = { ...ref.current, [threadId]: reduceTurn(ref.current[threadId], event) };
    setThreads(ref.current);
  }, []);
  const read = useCallback((threadId: string) => ref.current[threadId], []);
  const clear = useCallback(() => { ref.current = {}; setThreads(ref.current); }, []);
  return { threads, apply, read, clear };
}
