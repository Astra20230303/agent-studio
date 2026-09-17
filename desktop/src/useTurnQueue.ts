import { useRef, useState } from 'react';
import { finishQueuedTurn, restoreQueue } from './turnQueue';
import type { QueuedTurn } from './turnQueue';

const key = 'felix-turn-queue-v1';
export function useTurnQueue() {
  const [items, setItems] = useState(() => restoreQueue(localStorage.getItem(key)));
  const ref = useRef(items);
  const change = (fn: (items: QueuedTurn[]) => QueuedTurn[]) => {
    const next = fn(ref.current);
    // Persist before exposing a state transition that could dispatch work.
    localStorage.setItem(key, JSON.stringify(next));
    ref.current = next; setItems(next);
  };
  return {
    items, read: () => ref.current, change,
    finish: (threadId: string, turnId: string, success: boolean) => change(items => finishQueuedTurn(items, threadId, turnId, success)),
    pause: () => change(items => items.map(item => ({ ...item, status: 'paused', error: item.status === 'sending' ? '连接断开，发送结果未知，请检查记录后再试。' : '连接断开，队列已暂停。' }))),
  };
}
