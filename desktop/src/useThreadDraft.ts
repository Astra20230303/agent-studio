import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import { persistentStorage } from './persistentStorage';

const key = 'felix-thread-drafts-v1';
export function useThreadDraft(threadId?: string) {
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(persistentStorage.getItem(key) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    } catch { return {}; }
  });
  const id = threadId || 'new';
  useEffect(() => {
    let disposed = false;
    void persistentStorage.setItem(key, JSON.stringify(drafts)).then(() => { if (!disposed) setSaveFailed(false); }, () => { if (!disposed) setSaveFailed(true); });
    return () => { disposed = true; };
  }, [drafts, saveAttempt]);
  const setDraft = (value: SetStateAction<string>, targetId = id) => setDrafts(previous => {
    const next = typeof value === 'function' ? value(previous[targetId] || '') : value;
    const result = { ...previous };
    if (next) result[targetId] = next; else delete result[targetId];
    return result;
  });
  return [drafts[id] || '', setDraft, { saveFailed, retry: () => setSaveAttempt(attempt => attempt + 1) }] as const;
}
