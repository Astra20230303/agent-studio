import { useRef, useState } from 'react';
import { interruptTurn } from './codexClient';

export function useTurnInterrupt(threadId?: string, turnId?: string) {
  const locks = useRef(new Set<string>());
  const [pending, setPending] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = JSON.stringify([threadId, turnId]);
  const cancel = async () => {
    if (!threadId || !turnId || locks.current.has(key)) return;
    locks.current.add(key); setPending(current => [...current, key]);
    setErrors(current => { const next = { ...current }; delete next[key]; return next; });
    try { await interruptTurn(threadId, turnId); }
    catch (error) { setErrors(current => ({ ...current, [key]: `停止失败：${error instanceof Error ? error.message : String(error)}` })); }
    finally { locks.current.delete(key); setPending(current => current.filter(item => item !== key)); }
  };
  return { cancel, pending: pending.includes(key), error: errors[key] };
}
