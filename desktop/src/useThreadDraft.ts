import { useDraftStorage, type DraftSchema } from './useDraftStorage';
const schema: DraftSchema<string> = { key: 'felix-thread-drafts-v1', empty: () => '', valid: (value): value is string => typeof value === 'string', removeEmpty: value => !value };
export function useThreadDraft(threadId?: string) { return useDraftStorage(schema, threadId); }
