export interface HistoryReadOptions {
  signal?: AbortSignal;
  onProgress?: (progress: { pages: number; items: number }) => void;
}
export interface ThreadHistory {
  readAll(threadId: string, options?: HistoryReadOptions): Promise<unknown[]>;
}

function readWithCancellation(read: () => Promise<unknown>, signal?: AbortSignal): Promise<unknown> {
  if (!signal) return read();
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return read(); }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function createThreadHistory(readPage: (threadId: string, cursor?: string) => Promise<unknown>): ThreadHistory {
  return {
    async readAll(threadId, { signal, onProgress } = {}) {
      const items: unknown[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      let pages = 0;
      do {
        signal?.throwIfAborted();
        const page = await readWithCancellation(() => readPage(threadId, cursor), signal) as { data?: unknown; nextCursor?: unknown } | null;
        signal?.throwIfAborted();
        if (!page || !Array.isArray(page.data) || page.nextCursor != null && (typeof page.nextCursor !== 'string' || !page.nextCursor.trim())) {
          throw Error('服务端历史格式无效');
        }
        // Preserve unknown item types for forward-compatible rendering/export.
        items.push(...page.data);
        cursor = typeof page.nextCursor === 'string' ? page.nextCursor : undefined;
        if (cursor && seen.has(cursor)) throw Error('服务端历史分页重复，请重试');
        if (cursor) seen.add(cursor);
        onProgress?.({ pages: ++pages, items: items.length });
      } while (cursor);
      signal?.throwIfAborted();
      return items;
    },
  };
}
