type Snapshot = { ok: boolean; error?: string; values?: Record<string, string | null>; recovered?: string[] };
export type StorageBridge = {
  read: () => Promise<Snapshot>;
  importLegacy: (values: Record<string, string>) => Promise<Snapshot>;
  write: (key: string, value: string) => Promise<{ ok: boolean; error?: string }>;
  writeQueue: (value: string) => { ok: boolean; error?: string };
};

let cache: Record<string, string | null> | undefined;
export async function initializeStorage() {
  const bridge = globalThis.window?.desktop?.storage;
  if (!bridge) return [];
  const snapshot = await bridge.read();
  if (!snapshot.ok || !snapshot.values) throw Error(snapshot.error || '无法读取本机数据');
  const legacy: Record<string, string> = {};
  for (const [key, value] of Object.entries(snapshot.values)) {
    if (value !== null) continue;
    const previous = localStorage.getItem(key);
    if (previous !== null) legacy[key] = previous;
  }
  const loaded = Object.keys(legacy).length ? await bridge.importLegacy(legacy) : snapshot;
  if (!loaded.ok || !loaded.values) throw Error(loaded.error || '无法迁移旧数据');
  cache = loaded.values;
  return loaded.recovered || [];
}

export const persistentStorage = {
  getItem(key: string): string | null {
    if (!globalThis.window?.desktop?.storage) return localStorage.getItem(key);
    if (!cache) throw Error('本机数据尚未加载');
    return cache[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const bridge = globalThis.window?.desktop?.storage;
    if (!bridge) { localStorage.setItem(key, value); return; }
    if (!cache) throw Error('本机数据尚未加载');
    cache[key] = value;
    const result = await bridge.write(key, value);
    if (!result.ok) throw Error(result.error || '本机数据保存失败');
  },
  setQueue(value: string) {
    const bridge = globalThis.window?.desktop?.storage;
    if (!bridge) { localStorage.setItem('felix-turn-queue-v1', value); return; }
    if (!cache) throw Error('本机数据尚未加载');
    const result = bridge.writeQueue(value);
    if (!result.ok) throw Error(result.error || '队列保存失败');
    cache['felix-turn-queue-v1'] = value;
  },
};
