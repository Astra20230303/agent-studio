export function mcpToolHints(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const hints = value as Record<string, unknown>;
  const labels: Record<string, [string, string]> = {
    readOnlyHint: ['只读：是', '只读：否'],
    destructiveHint: ['可能破坏数据：是', '可能破坏数据：否'],
    idempotentHint: ['重复调用结果不变：是', '重复调用结果不变：否'],
    openWorldHint: ['可能访问外部系统：是', '可能访问外部系统：否'],
  };
  return Object.entries(labels).flatMap(([key, values]) => typeof hints[key] === 'boolean' ? [values[hints[key] ? 0 : 1]] : []);
}
