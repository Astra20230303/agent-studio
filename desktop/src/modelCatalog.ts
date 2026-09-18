import { isExplicitReasoningEffort, type ExplicitReasoningEffort } from './reasoningEffort.ts';
export function modelCatalogIds(result: unknown): string[] {
  const response = result as { ok?: unknown; models?: unknown; error?: unknown } | null;
  if (response?.ok !== true) throw Error(typeof response?.error === 'string' && response.error ? response.error : '无法获取模型列表。');
  if (!Array.isArray(response.models) || !response.models.length || !response.models.every(id => typeof id === 'string' && id.trim() && id === id.trim())) {
    throw Error('模型列表格式无效，请刷新重试。');
  }
  return [...new Set(response.models)];
}

export function modelEffortCapabilities(result: unknown, models: string[]): Record<string, ExplicitReasoningEffort[]> {
  const output: Record<string, ExplicitReasoningEffort[]> = Object.create(null);
  const entries = (result as { effortCapabilities?: unknown } | null)?.effortCapabilities;
  if (!Array.isArray(entries)) return output;
  for (const entry of entries) {
    if (!entry || typeof entry.model !== 'string' || !models.includes(entry.model)
      || entries.filter(other => other?.model === entry.model).length !== 1
      || !Array.isArray(entry.values) || !entry.values.every(isExplicitReasoningEffort)) continue;
    output[entry.model] = [...new Set<ExplicitReasoningEffort>(entry.values)];
  }
  return output;
}
