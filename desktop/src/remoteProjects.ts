export type RemoteProject = { id: string; name: string; roots: string[]; metadata: Record<string, string>; position: number; createdAt: number; updatedAt: number; recencyAt?: number | null };
export type RemoteProjectPage = { data: RemoteProject[]; nextCursor?: string };
const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export function readRemoteProjectPage(value: unknown): RemoteProjectPage {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.nextCursor != null && !identity(input.nextCursor)) throw new Error('远端项目列表格式无效');
  const ids = new Set<string>();
  const data = input.data.map((item: any) => {
    if (!identity(item?.id) || !identity(item?.name) || ids.has(item.id) || !Array.isArray(item.roots) || item.roots.some((root: unknown) => !identity(root)) || !item.metadata || typeof item.metadata !== 'object' || Array.isArray(item.metadata) || Object.entries(item.metadata).some(([key, value]) => !identity(key) || typeof value !== 'string') || !Number.isSafeInteger(item.position) || !Number.isSafeInteger(item.createdAt) || !Number.isSafeInteger(item.updatedAt) || item.recencyAt != null && !Number.isSafeInteger(item.recencyAt)) throw new Error('远端项目条目无效');
    ids.add(item.id);
    return { id: item.id, name: item.name, roots: [...item.roots], metadata: { ...item.metadata }, position: item.position, createdAt: item.createdAt, updatedAt: item.updatedAt, ...(item.recencyAt != null ? { recencyAt: item.recencyAt } : {}) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
