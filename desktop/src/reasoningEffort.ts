export const effortLevels = [
  { value: 'default', label: '模型默认', description: '由模型和运行配置决定推理强度' },
  { value: 'none', label: '关闭', description: '显式请求不使用推理；需要模型支持' },
  { value: 'minimal', label: '极低', description: '请求最少推理；需要模型支持' },
  { value: 'low', label: '低', description: '响应更快，适合简单操作' },
  { value: 'medium', label: '中', description: '平衡响应速度与推理深度' },
  { value: 'high', label: '高', description: '深入推理，可能需要更长时间' },
  { value: 'xhigh', label: '极高', description: '请求更高推理强度；需要模型支持' },
  { value: 'max', label: 'Max', description: '请求模型的 max 强度；需要模型支持' },
  { value: 'ultra', label: 'Ultra', description: '请求模型的 ultra 强度；需要模型支持' },
  { value: 'persistent', label: 'Persistent', description: '请求模型的 persistent 强度；需要模型支持' },
] as const;
export type ReasoningEffort = typeof effortLevels[number]['value'];
export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return effortLevels.some(level => level.value === value);
}

export type ExplicitReasoningEffort = Exclude<ReasoningEffort, 'default'>;
export const explicitEffortLevels = effortLevels.filter(level => level.value !== 'default');
export function isExplicitReasoningEffort(value: unknown): value is ExplicitReasoningEffort {
  return value !== 'default' && isReasoningEffort(value);
}
export function effortLabel(value?: ExplicitReasoningEffort) {
  return effortLevels.find(level => level.value === (value ?? 'default'))!.label;
}

export function unsupportedEffort(value: string, supported?: readonly string[]): boolean {
  return value !== 'default' && supported !== undefined && !supported.includes(value);
}
