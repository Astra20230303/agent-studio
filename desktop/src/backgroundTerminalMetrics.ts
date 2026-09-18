import type { BackgroundTerminal } from './codexClient';

export function backgroundTerminalMetrics(item: BackgroundTerminal): string {
  const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const pid = valid(item.osPid) && Number.isSafeInteger(item.osPid) && item.osPid > 0 ? String(item.osPid) : '未知';
  const cpu = valid(item.cpuPercent) ? `${item.cpuPercent.toFixed(1)}%` : '未知';
  const memory = valid(item.rssKb) ? `${(item.rssKb / 1024).toFixed(1)} MiB` : '未知';
  return `PID ${pid} · CPU ${cpu} · 内存 ${memory}`;
}
