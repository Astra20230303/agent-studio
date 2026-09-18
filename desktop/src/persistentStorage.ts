import { createAsyncStorage } from './asyncStorage.ts';
export type { StorageBridge } from './asyncStorage.ts';

export const persistentStorage = createAsyncStorage(
  () => globalThis.window?.desktop?.storage,
  () => localStorage,
);
export const initializeStorage = persistentStorage.initialize;
