import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import { persistentStorage } from './persistentStorage';
export type SelectedSkill = { name: string; path: string };
export function useSkillDraft(threadId?: string) {
  const [drafts, setDrafts] = useState<Record<string, SelectedSkill[]>>(() => {
    try {
      const data = JSON.parse(persistentStorage.getItem('felix-skill-drafts-v1') || '{}');
      return Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value) && value.every(skill => typeof skill?.name === 'string' && typeof skill?.path === 'string'))) as Record<string, SelectedSkill[]>;
    } catch { return {}; }
  });
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    void persistentStorage.setItem('felix-skill-drafts-v1', JSON.stringify(drafts)).then(() => { if (!disposed) setSaveFailed(false); }, () => { if (!disposed) setSaveFailed(true); });
    return () => { disposed = true; };
  }, [drafts]);
  const id = threadId || 'new';
  const set = (value: SetStateAction<SelectedSkill[]>, target = id) => setDrafts(previous => ({ ...previous, [target]: typeof value === 'function' ? value(previous[target] || []) : value }));
  return [drafts[id] || [], set, saveFailed] as const;
}
