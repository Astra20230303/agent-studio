const identity = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\0\r\n]/.test(value);
export function readThreadName(value: any): { threadId: string; name?: string } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !identity(value.threadId)) return;
  if (value.threadName != null && (typeof value.threadName !== 'string' || value.threadName.trim() !== value.threadName || !value.threadName || /[\0\r\n]/.test(value.threadName))) return;
  return { threadId: value.threadId, ...(value.threadName ? { name: value.threadName } : {}) };
}
