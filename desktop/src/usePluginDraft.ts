import { useDraftStorage, type DraftSchema } from './useDraftStorage';
import type { Plugin } from './extensions';
const schema: DraftSchema<Plugin[]> = { key: 'felix-plugin-drafts-v1', empty: () => [], valid: (value): value is Plugin[] => Array.isArray(value) && value.every(plugin => typeof plugin?.id === 'string' && !!plugin.id && typeof plugin.name === 'string'), removeEmpty: value => !value.length };
export function usePluginDraft(threadId?: string) { return useDraftStorage(schema, threadId); }
