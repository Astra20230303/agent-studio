export type RemoteProject = { id: string; name: string; roots: string[]; metadata: Record<string, string>; position: number; createdAt: number; updatedAt: number; recencyAt?: number | null };
export type RemoteProjectPage = { data: RemoteProject[]; nextCursor?: string };
export type RemoteProjectChange = { projectId: string; changeType: 'created' | 'updated' | 'deleted' };
const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export function readRemoteProjectChange(value: unknown): RemoteProjectChange | undefined {
  const input = value as any;
  if (!identity(input?.projectId) || !['created', 'updated', 'deleted'].includes(input.changeType)) return;
  return { projectId: input.projectId, changeType: input.changeType };
}
function projectRoots(roots: string[]) { if (!Array.isArray(roots) || roots.some(root => typeof root !== 'string' || !root.trim() || /[\0\r\n]/.test(root))) throw new Error('远端项目根目录无效'); return roots.map(path => ({ path: path.trim() })); }
function projectMetadata(metadata: Record<string, string>) { if (!metadata || Array.isArray(metadata) || Object.entries(metadata).some(([key, value]) => !/^\S+$/.test(key) || typeof value !== 'string' || /[\0\r\n]/.test(value))) throw new Error('远端项目 metadata 无效'); return { ...metadata }; }
export function createRemoteProjectParams(name: string, roots: string[], metadata: Record<string, string>, idempotencyKey: string) {
  if (!name.trim() || /[\0\r\n]/.test(name) || !/^\S+$/.test(idempotencyKey)) throw new Error('远端项目创建参数无效');
  return { name: name.trim(), roots: projectRoots(roots), metadata: projectMetadata(metadata), idempotencyKey };
}
export function updateRemoteProjectParams(projectId: string, name: string, roots: string[], metadata: Record<string, string>) {
  if (!/^\S+$/.test(projectId) || !name.trim() || /[\0\r\n]/.test(name)) throw new Error('远端项目更新参数无效');
  return { projectId, name: name.trim(), roots: projectRoots(roots), metadata: projectMetadata(metadata) };
}
export function deleteRemoteProjectParams(projectId: string) { if (!/^\S+$/.test(projectId)) throw new Error('远端项目身份无效'); return { projectId }; }
export function readRemoteProject(value: unknown): RemoteProject {
  const page = readRemoteProjectPage({ data: [value] });
  return page.data[0];
}
export function readRemoteProjectPage(value: unknown): RemoteProjectPage {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.nextCursor != null && !identity(input.nextCursor)) throw new Error('远端项目列表格式无效');
  const ids = new Set<string>();
  const data = input.data.map((item: any) => {
    if (!identity(item?.id) || !identity(item?.name) || ids.has(item.id) || !Array.isArray(item.roots) || item.roots.some((root: unknown) => !root || typeof root !== 'object' || !identity((root as any).path)) || !item.metadata || typeof item.metadata !== 'object' || Array.isArray(item.metadata) || Object.entries(item.metadata).some(([key, value]) => !identity(key) || typeof value !== 'string') || !Number.isSafeInteger(item.position) || !Number.isSafeInteger(item.createdAt) || !Number.isSafeInteger(item.updatedAt) || item.recencyAt != null && !Number.isSafeInteger(item.recencyAt)) throw new Error('远端项目条目无效');
    ids.add(item.id);
    return { id: item.id, name: item.name, roots: item.roots.map((root: any) => root.path), metadata: { ...item.metadata }, position: item.position, createdAt: item.createdAt, updatedAt: item.updatedAt, ...(item.recencyAt != null ? { recencyAt: item.recencyAt } : {}) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
