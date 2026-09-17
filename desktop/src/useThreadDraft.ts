import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';

const key = 'felix-thread-drafts-v1';
export function useThreadDraft(threadId?: string) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    } catch { return {}; }
  });
  const id = threadId || 'new';
  useEffect(() => { localStorage.setItem(key, JSON.stringify(drafts)); }, [drafts]);
  const setDraft = (value: SetStateAction<string>) => setDrafts(previous => {
    const next = typeof value === 'function' ? value(previous[id] || '') : value;
    const result = { ...previous };
    if (next) result[id] = next; else delete result[id];
    return result;
  });
  return [drafts[id] || '', setDraft] as const;
}
