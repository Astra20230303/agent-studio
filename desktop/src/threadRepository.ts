import { threadPage } from './threadPage.ts';

export type ThreadPage = ReturnType<typeof threadPage>;
export interface ThreadQuery {
  cursor?: string;
  search?: string;
  archived?: boolean;
}
export interface ThreadRepository {
  query(options?: ThreadQuery): Promise<ThreadPage>;
}
interface ThreadSource {
  list(cursor?: string): Promise<unknown>;
  archived(cursor?: string): Promise<unknown>;
  search(search: string, cursor?: string, archived?: boolean): Promise<unknown>;
}

// Return the same validated page for browsing and searching either collection.
// Pagination history and connection/selection lifetimes belong to the caller.
export function createThreadRepository(source: ThreadSource): ThreadRepository {
  return {
    async query({ cursor, search = '', archived = false } = {}) {
      const query = search.trim();
      if (!query) return threadPage(await (archived ? source.archived(cursor) : source.list(cursor)));
      const response = await source.search(query, cursor, archived) as any;
      if (!Array.isArray(response?.data) || response.data.some((item: any) =>
        typeof item?.thread?.id !== 'string' || !item.thread.id.trim() || typeof item.snippet !== 'string')) {
        throw Error('服务端返回的会话搜索结果无效，请重试');
      }
      return threadPage({ ...response, data: response.data.map((item: any) => ({ ...item.thread, snippet: item.snippet })) });
    },
  };
}
