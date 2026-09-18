import { useDraftStorage, type DraftSchema } from './useDraftStorage';
export type SelectedSkill = { name: string; path: string };
const schema: DraftSchema<SelectedSkill[]> = { key: 'felix-skill-drafts-v1', empty: () => [], valid: (value): value is SelectedSkill[] => Array.isArray(value) && value.every(skill => typeof skill?.name === 'string' && typeof skill?.path === 'string') };
export function useSkillDraft(threadId?: string) { return useDraftStorage(schema, threadId); }
