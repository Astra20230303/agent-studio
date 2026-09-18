const integer = (value: unknown): value is number => value == null || Number.isSafeInteger(value) && (value as number) >= 0;
export type AccountUsage = { summary: { lifetimeTokens?: number; peakDailyTokens?: number; longestRunningTurnSec?: number; currentStreakDays?: number; longestStreakDays?: number }; daily: { startDate: string; tokens: number }[] };
export function readAccountUsage(value: any): AccountUsage {
  const summary = value?.summary;
  if (!summary || typeof summary !== 'object' || !integer(summary.lifetimeTokens) || !integer(summary.peakDailyTokens) || !integer(summary.longestRunningTurnSec) || !integer(summary.currentStreakDays) || !integer(summary.longestStreakDays)) throw new Error('用量摘要无效');
  const daily = value.dailyUsageBuckets == null ? [] : value.dailyUsageBuckets;
  if (!Array.isArray(daily) || daily.some((item: any) => !item || typeof item.startDate !== 'string' || !item.startDate.trim() || !integer(item.tokens))) throw new Error('每日用量无效');
  return { summary: { ...(summary.lifetimeTokens != null ? { lifetimeTokens: summary.lifetimeTokens } : {}), ...(summary.peakDailyTokens != null ? { peakDailyTokens: summary.peakDailyTokens } : {}), ...(summary.longestRunningTurnSec != null ? { longestRunningTurnSec: summary.longestRunningTurnSec } : {}), ...(summary.currentStreakDays != null ? { currentStreakDays: summary.currentStreakDays } : {}), ...(summary.longestStreakDays != null ? { longestStreakDays: summary.longestStreakDays } : {}) }, daily: daily.slice(-14).map((item: any) => ({ startDate: item.startDate, tokens: item.tokens })) };
}
