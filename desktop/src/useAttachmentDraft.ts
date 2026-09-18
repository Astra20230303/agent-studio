import { useDraftStorage, type DraftSchema } from './useDraftStorage';
const schema: DraftSchema<string[]> = { key: 'felix-attachments-v1', empty: () => [], valid: (value): value is string[] => Array.isArray(value) && value.every(path => typeof path === 'string'), removeEmpty: value => !value.length };
export function useAttachmentDraft(threadId?: string) { return useDraftStorage(schema, threadId); }
