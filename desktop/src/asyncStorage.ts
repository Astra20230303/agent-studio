type Snapshot = { ok: boolean; error?: string; values?: Record<string, string | null>; recovered?: string[] };
export type StorageBridge = {
  read: () => Promise<Snapshot>;
  importLegacy: (values: Record<string, string>) => Promise<Snapshot>;
  write: (key: string, value: string) => Promise<{ ok: boolean; error?: string }>;
  writeQueue: (value: string) => { ok: boolean; error?: string };
};

export function createAsyncStorage(getBridge: () => StorageBridge | undefined, getLegacy: () => Pick<Storage, 'getItem' | 'setItem'>) {
  let cache: Record<string, string | null> | undefined;
  async function initialize() {
    const bridge = getBridge();
    if (!bridge) return [];
    const snapshot = await bridge.read();
    if (!snapshot.ok || !snapshot.values) throw Error(snapshot.error || '无法读取本机数据');
    const legacy: Record<string, string> = {};
    for (const [key, value] of Object.entries(snapshot.values)) {
      if (value !== null) continue;
      const previous = getLegacy().getItem(key);
      if (previous !== null) legacy[key] = previous;
    }
    const loaded = Object.keys(legacy).length ? await bridge.importLegacy(legacy) : snapshot;
    if (!loaded.ok || !loaded.values) throw Error(loaded.error || '无法迁移旧数据');
    cache = { ...loaded.values };
    return loaded.recovered || [];
  }

  return {
    initialize,
    getItem(key: string): string | null {
      if (!getBridge()) return getLegacy().getItem(key);
      if (!cache) throw Error('本机数据尚未加载');
      return cache[key] ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      if (key === 'felix-turn-queue-v1') throw Error('队列必须使用同步保存');
      const bridge = getBridge();
      if (!bridge) { getLegacy().setItem(key, value); return; }
      if (!cache) throw Error('本机数据尚未加载');
      cache[key] = value;
      // Forward immediately: the native owner serializes writes and flushes on exit.
      // Keeping a renderer-side queue would hide pending writes from that exit flush.
      const result = await bridge.write(key, value);
      if (!result.ok) throw Error(result.error || '本机数据保存失败');
    },
    setQueue(value: string) {
      const bridge = getBridge();
      if (!bridge) { getLegacy().setItem('felix-turn-queue-v1', value); return; }
      if (!cache) throw Error('本机数据尚未加载');
      const result = bridge.writeQueue(value);
      if (!result.ok) throw Error(result.error || '队列保存失败');
      cache['felix-turn-queue-v1'] = value;
    },
  };
}
