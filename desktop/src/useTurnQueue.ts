import { useRef, useState } from 'react';
import { finishQueuedTurn, restoreQueue } from './turnQueue';
import type { QueuedTurn } from './turnQueue';

const key = 'felix-turn-queue-v1';
export function useTurnQueue() {
  const [initial] = useState(() => {
    try { return { items: restoreQueue(localStorage.getItem(key)), failed: false }; }
    catch { return { items: [] as QueuedTurn[], failed: true }; }
  });
  const [items, setItems] = useState(initial.items);
  const [saveFailed, setSaveFailed] = useState(initial.failed);
  const unread = useRef(initial.failed);
  const ref = useRef(items);
  const change = (fn: (items: QueuedTurn[]) => QueuedTurn[], requireSaved = false) => {
    if (unread.current) { setSaveFailed(true); return false; }
    const next = fn(ref.current);
    // Persist before exposing a state transition that could dispatch work.
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch {
      const paused = (requireSaved ? ref.current : next).map(item => ({ ...item, status: 'paused' as const, error: '队列保存失败，请核对会话记录后继续。' }));
      ref.current = paused; setItems(paused); setSaveFailed(true); return false;
    }
    ref.current = next; setItems(next);
    setSaveFailed(false); return true;
  };
  return {
    items, saveFailed, read: () => ref.current, change,
    retry: () => {
      if (unread.current) {
        try {
          const restored = restoreQueue(localStorage.getItem(key));
          unread.current = false; ref.current = restored; setItems(restored); setSaveFailed(false);
        } catch { setSaveFailed(true); }
      } else change(items => items);
    },
    finish: (threadId: string, turnId: string, success: boolean) => change(items => finishQueuedTurn(items, threadId, turnId, success)),
    pause: () => change(items => items.map(item => ({ ...item, status: 'paused', error: item.status === 'sending' ? '连接断开，发送结果未知，请检查记录后再试。' : '连接断开，队列已暂停。' }))),
  };
}
