import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
export function useAttachmentDraft(threadId?: string) {
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string[]>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('felix-attachments-v1') || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Array.isArray(value) && value.every(path => typeof path === 'string'))) as Record<string, string[]>;
    } catch { return {}; }
  });
  const id = threadId || 'new';
  useEffect(() => {
    try { localStorage.setItem('felix-attachments-v1', JSON.stringify(drafts)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [drafts, saveAttempt]);
  const set = (value: SetStateAction<string[]>, target = id) => setDrafts(previous => {
    const next = typeof value === 'function' ? value(previous[target] || []) : value;
    const result = { ...previous };
    if (next.length) result[target] = next; else delete result[target];
    return result;
  });
  return [drafts[id] || [], set, { saveFailed, retry: () => setSaveAttempt(attempt => attempt + 1) }] as const;
}
