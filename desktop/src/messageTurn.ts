type ReadTurns = (threadId: string, cursor?: string) => Promise<unknown>;

export async function findMessageTurn(read: ReadTurns, threadId: string, messageId: string): Promise<string | undefined> {
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await read(threadId, cursor) as any;
    if (!Array.isArray(page?.data) || page.nextCursor != null && (typeof page.nextCursor !== 'string' || !page.nextCursor.trim())
      || page.data.some((turn: any) => typeof turn?.id !== 'string' || !turn.id.trim() || !Array.isArray(turn.items)
        || turn.items.some((item: any) => typeof item?.id !== 'string' || !item.id.trim()))) {
      throw Error('服务端回合列表无效，请重试创建分支。');
    }
    const next: string | undefined = page.nextCursor ?? undefined;
    if (next && seen.has(next)) throw Error('服务端回合分页重复，请重试创建分支。');
    const turn = page.data.find((turn: any) => turn.items.some((item: any) => item.id === messageId || `live-${item.id}` === messageId));
    if (turn) return turn.id;
    if (next) seen.add(next);
    cursor = next;
  } while (cursor);
  return undefined;
}
