import { useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import { persistentStorage } from './persistentStorage';
export type SelectedSkill = { name: string; path: string };
const key = 'felix-skill-drafts-v1';
function readDrafts(): Record<string, SelectedSkill[]> {
  const data = JSON.parse(persistentStorage.getItem(key) ?? '{}');
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.values(data).every(value => Array.isArray(value) && value.every(skill => typeof skill?.name === 'string' && typeof skill?.path === 'string'))) throw Error('技能草稿格式无效');
  return data;
}
export function useSkillDraft(threadId?: string) {
  const [loaded] = useState(() => {
    try { return { drafts: readDrafts(), failed: false }; }
    catch { return { drafts: {} as Record<string, SelectedSkill[]>, failed: true }; }
  });
  const [drafts, setDrafts] = useState(loaded.drafts);
  const [readFailed, setReadFailed] = useState(loaded.failed);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  useEffect(() => {
    if (readFailed) return;
    let disposed = false;
    void persistentStorage.setItem(key, JSON.stringify(drafts)).then(() => { if (!disposed) setSaveFailed(false); }, () => { if (!disposed) setSaveFailed(true); });
    return () => { disposed = true; };
  }, [drafts, saveAttempt, readFailed]);
  const id = threadId || 'new';
  const set = (value: SetStateAction<SelectedSkill[]>, target = id) => setDrafts(previous => ({ ...previous, [target]: typeof value === 'function' ? value(previous[target] || []) : value }));
  const retry = () => {
    if (!readFailed) { setSaveAttempt(attempt => attempt + 1); return; }
    try {
      const restored = readDrafts();
      // Edits made while reads were blocked win, including explicit empty selections.
      setDrafts(previous => ({ ...restored, ...previous }));
      setReadFailed(false);
    } catch { /* Keep the original data protected until a successful read. */ }
  };
  return [drafts[id] || [], set, { saveFailed, readFailed, retry }] as const;
}
