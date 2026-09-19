const fallbackZones = ['UTC', 'Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];
const discover = () => Intl.supportedValuesOf('timeZone');

export function taskTimezones(current: string, local: string, supported: () => string[] = discover): string[] {
  let available: string[];
  try { available = supported(); } catch { available = fallbackZones; }
  // Keep aliases and saved values even when ICU's canonical directory omits them.
  return [...new Set([local, current, 'UTC', ...available].filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
