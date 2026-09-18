const percent = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 100;
export type RateLimits = { primary?: { usedPercent: number; windowDurationMins?: number; resetsAt?: number }; secondary?: { usedPercent: number; windowDurationMins?: number; resetsAt?: number }; limitName?: string };
export function readRateLimits(value: any): RateLimits {
  const source = value?.rateLimits;
  if (!source || typeof source !== 'object') throw new Error('额度响应无效');
  const read = (window: any) => window == null ? undefined : percent(window.usedPercent) && (window.windowDurationMins == null || Number.isSafeInteger(window.windowDurationMins) && window.windowDurationMins > 0) && (window.resetsAt == null || Number.isSafeInteger(window.resetsAt) && window.resetsAt >= 0) ? { usedPercent: window.usedPercent, ...(window.windowDurationMins != null ? { windowDurationMins: window.windowDurationMins } : {}), ...(window.resetsAt != null ? { resetsAt: window.resetsAt } : {}) } : (() => { throw new Error('额度窗口无效'); })();
  return { primary: read(source.primary), secondary: read(source.secondary), ...(source.limitName == null ? {} : typeof source.limitName === 'string' ? { limitName: source.limitName } : (() => { throw new Error('额度名称无效'); })()) };
}
