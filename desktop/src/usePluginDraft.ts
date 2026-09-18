import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import type { Plugin } from './extensions';
import { persistentStorage } from './persistentStorage';
export function usePluginDraft(threadId?: string) {
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Plugin[]>>(() => {
    try {
      const parsed = JSON.parse(persistentStorage.getItem('felix-plugin-drafts-v1') || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Array.isArray(value) && value.every(plugin => typeof plugin?.id === 'string' && !!plugin.id && typeof plugin.name === 'string'))) as Record<string, Plugin[]>;
    } catch { return {}; }
  });
  const id = threadId || 'new';
  useEffect(() => {
    let disposed = false;
    void persistentStorage.setItem('felix-plugin-drafts-v1', JSON.stringify(drafts)).then(() => { if (!disposed) setSaveFailed(false); }, () => { if (!disposed) setSaveFailed(true); });
    return () => { disposed = true; };
  }, [drafts, saveAttempt]);
  const set = (value: SetStateAction<Plugin[]>, target = id) => setDrafts(previous => {
    const next = typeof value === 'function' ? value(previous[target] || []) : value;
    const result = { ...previous };
    if (next.length) result[target] = next; else delete result[target];
    return result;
  });
  return [drafts[id] || [], set, { saveFailed, retry: () => setSaveAttempt(attempt => attempt + 1) }] as const;
}
