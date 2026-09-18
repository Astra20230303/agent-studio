export type WorkspaceEntry = { revision?: string; line?: number; column?: number; matchLength?: number; snippet?: string; name: string; path: string; directory: boolean; symlink: boolean };
export type WorkspaceListing = { entries: WorkspaceEntry[]; truncated?: boolean; skipped?: number };
const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function parseWorkspaceResult(value: unknown, action: 'list' | 'search' | 'search-content' | 'read') {
  if (!object(value)) throw Error('工作区文件响应格式无效，请重试');
  if (action === 'read') {
    if (!(typeof value.text === 'string' || typeof value.image === 'string' && value.image.length > 0 || value.binary === true) || value.text != null && typeof value.text !== 'string' || value.revision != null && typeof value.revision !== 'string'
      || value.size != null && (!Number.isInteger(value.size) || value.size < 0) || value.image != null && typeof value.image !== 'string' || value.binary != null && typeof value.binary !== 'boolean') throw Error('工作区文件响应格式无效，请重试');
    if (['truncated', 'encodingInvalid'].some(key => value[key] != null && typeof value[key] !== 'boolean') || value.previewBytes != null && (!Number.isSafeInteger(value.previewBytes) || value.previewBytes < 0)) throw Error('工作区文件响应格式无效，请重试');
    return structuredClone(value) as any;
  }
  if (!Array.isArray(value.entries) || value.truncated != null && typeof value.truncated !== 'boolean' || value.skipped != null && (!Number.isInteger(value.skipped) || value.skipped < 0)
    || value.entries.some((entry: any) => !object(entry) || typeof entry.name !== 'string' || typeof entry.path !== 'string' || typeof entry.directory !== 'boolean' || typeof entry.symlink !== 'boolean'
      || entry.revision != null && typeof entry.revision !== 'string' || entry.line != null && (!Number.isInteger(entry.line) || entry.line < 1)
      || entry.column != null && (!Number.isInteger(entry.column) || entry.column < 1) || entry.matchLength != null && (!Number.isInteger(entry.matchLength) || entry.matchLength < 1)
      || entry.snippet != null && typeof entry.snippet !== 'string')) throw Error('工作区文件响应格式无效，请重试');
  return structuredClone(value) as WorkspaceListing;
}
