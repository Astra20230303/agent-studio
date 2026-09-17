import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
export type SelectedSkill = { name: string; path: string };
export function useSkillDraft(threadId?: string) {
  const [drafts, setDrafts] = useState<Record<string, SelectedSkill[]>>(() => {
    try {
      const data = JSON.parse(localStorage.getItem('felix-skill-drafts-v1') || '{}');
      return Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value) && value.every(skill => typeof skill?.name === 'string' && typeof skill?.path === 'string'))) as Record<string, SelectedSkill[]>;
    } catch { return {}; }
  });
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    try { localStorage.setItem('felix-skill-drafts-v1', JSON.stringify(drafts)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [drafts]);
  const id = threadId || 'new';
  const set = (value: SetStateAction<SelectedSkill[]>, target = id) => setDrafts(previous => ({ ...previous, [target]: typeof value === 'function' ? value(previous[target] || []) : value }));
  return [drafts[id] || [], set, saveFailed] as const;
}
