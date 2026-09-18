export interface ThreadHistory {
  readAll(threadId: string): Promise<unknown[]>;
}

export function createThreadHistory(readPage: (threadId: string, cursor?: string) => Promise<unknown>): ThreadHistory {
  return {
    async readAll(threadId) {
      const items: unknown[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await readPage(threadId, cursor) as { data?: unknown; nextCursor?: unknown } | null;
        if (!page || !Array.isArray(page.data) || page.nextCursor != null && (typeof page.nextCursor !== 'string' || !page.nextCursor.trim())) {
          throw Error('服务端历史格式无效');
        }
        // Preserve unknown item types for forward-compatible rendering/export.
        items.push(...page.data);
        cursor = typeof page.nextCursor === 'string' ? page.nextCursor : undefined;
        if (cursor && seen.has(cursor)) throw Error('服务端历史分页重复，请重试');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return items;
    },
  };
}
