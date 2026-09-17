import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
export function useAttachmentDraft(threadId?: string) {
  const [drafts, setDrafts] = useState<Record<string, string[]>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('felix-attachments-v1') || '{}');
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Array.isArray(value) && value.every(path => typeof path === 'string'))) as Record<string, string[]>;
    } catch { return {}; }
  });
  const id = threadId || 'new';
  useEffect(() => { localStorage.setItem('felix-attachments-v1', JSON.stringify(drafts)); }, [drafts]);
  const set = (value: SetStateAction<string[]>, target = id) => setDrafts(previous => ({ ...previous, [target]: typeof value === 'function' ? value(previous[target] || []) : value }));
  return [drafts[id] || [], set] as const;
}
