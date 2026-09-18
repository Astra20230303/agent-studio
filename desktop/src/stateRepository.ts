import type { DesktopState } from './domain';
import { decodeState } from './store.ts';
import { persistentStorage } from './persistentStorage.ts';

export interface StateRepository {
  load(): Promise<DesktopState>;
  save(state: DesktopState): Promise<void>;
}
export interface StateStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}
const KEY = 'codex-desktop-state-v1';

export function createStateRepository(storage: StateStorage): StateRepository {
  return {
    async load() {
      try { return decodeState(await storage.getItem(KEY)); }
      catch { throw Error('会话和设置读取失败，原始数据已保留。请修复数据后重试读取。'); }
    },
    async save(state) {
      // Capture the snapshot before yielding; subsequent UI edits cannot alter this write.
      await storage.setItem(KEY, JSON.stringify(state));
    },
  };
}

export const stateRepository = createStateRepository(persistentStorage);
