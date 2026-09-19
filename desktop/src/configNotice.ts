export function configNotice(method: string | undefined, params: unknown): string | undefined {
  if (!['configWarning', 'deprecationNotice'].includes(method || '')) return;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return;
  const value = params as Record<string, any>;
  if (typeof value.summary !== 'string' || !value.summary.trim() || value.details != null && typeof value.details !== 'string') return;
  const lines = [`${method === 'configWarning' ? '配置警告' : '弃用提示'}：${value.summary}`];
  if (value.details?.trim()) lines.push(value.details);
  if (method === 'configWarning' && typeof value.path === 'string' && value.path.trim()) {
    const start = value.range?.start;
    const position = start && Number.isSafeInteger(start.line) && start.line > 0 && Number.isSafeInteger(start.column) && start.column > 0 ? `（第 ${start.line} 行，第 ${start.column} 列）` : '';
    lines.push(`配置文件：${value.path}${position}`);
  }
  return lines.join('\n');
}
