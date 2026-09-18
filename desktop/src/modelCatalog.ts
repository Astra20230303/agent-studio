export function modelCatalogIds(result: unknown): string[] {
  const response = result as { ok?: unknown; models?: unknown; error?: unknown } | null;
  if (response?.ok !== true) throw Error(typeof response?.error === 'string' && response.error ? response.error : '无法获取模型列表。');
  if (!Array.isArray(response.models) || !response.models.length || !response.models.every(id => typeof id === 'string' && id.trim() && id === id.trim())) {
    throw Error('模型列表格式无效，请刷新重试。');
  }
  return [...new Set(response.models)];
}
