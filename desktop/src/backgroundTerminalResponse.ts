export type BackgroundTerminalValue = { processId: string; command: string; cwd: string; osPid?: number | null; cpuPercent?: number | null; rssKb?: number | null };
const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const metric = (value: unknown) => value == null || typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function parseBackgroundTerminalPage(value: unknown) {
  if (!object(value) || !Array.isArray(value.data) || value.nextCursor != null && typeof value.nextCursor !== 'string') throw Error('后台命令列表格式无效，请重试');
  const ids = new Set<string>();
  const data = value.data.map((item: any) => {
    if (!object(item) || typeof item.processId !== 'string' || !item.processId.trim() || ids.has(item.processId)
      || typeof item.command !== 'string' || !item.command.trim() || typeof item.cwd !== 'string' || !item.cwd.trim()
      || !metric(item.osPid) || !metric(item.cpuPercent) || !metric(item.rssKb)) throw Error('后台命令条目格式无效，请重试');
    ids.add(item.processId); return structuredClone(item);
  });
  return { data, nextCursor: value.nextCursor || undefined } as { data: BackgroundTerminalValue[]; nextCursor?: string };
}
export function parseTermination(value: unknown) {
  if (!object(value) || typeof value.terminated !== 'boolean') throw Error('后台命令终止响应格式无效，请重试');
  return value.terminated;
}
