export type CodexModelUpgrade = { model: string; upgradeCopy?: string; modelLink?: string; migrationMarkdown?: string; retirementAt?: number };
export type CodexModel = { upgradeInfo?: CodexModelUpgrade; id: string; model: string; displayName: string; description: string; hidden: boolean; supportedReasoningEfforts: { reasoningEffort: string; description: string }[]; multiAgentVersion?: string; serviceTiers: { id: string; name: string; description: string }[]; defaultServiceTier?: string };
const text = (value: unknown, label: string): string => { if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error(`${label} 无效`); return value; };
const description = (value: unknown): string => { if (typeof value !== 'string') throw new Error('模型描述无效'); return value; };
function readUpgrade(item: any): CodexModelUpgrade | undefined {
  if (item.upgrade != null) text(item.upgrade, '替代模型');
  const info = item.upgradeInfo;
  if (info == null) return item.upgrade == null ? undefined : { model: item.upgrade };
  if (typeof info !== 'object' || Array.isArray(info)) throw new Error('模型升级信息无效');
  const result: CodexModelUpgrade = { model: text(info.model, '替代模型') };
  for (const key of ['upgradeCopy', 'modelLink', 'migrationMarkdown'] as const) {
    if (info[key] != null) {
      if (typeof info[key] !== 'string') throw new Error('模型升级说明无效');
      result[key] = info[key];
    }
  }
  if (info.retirementAt != null) {
    if (!Number.isSafeInteger(info.retirementAt) || Math.abs(info.retirementAt) > 8640000000000) throw new Error('模型退役时间无效');
    result.retirementAt = info.retirementAt;
  }
  return result;
}
export function readCodexModelPage(value: unknown): { data: CodexModel[]; nextCursor?: string } {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.data.length > 500 || input.nextCursor != null && (typeof input.nextCursor !== 'string' || !input.nextCursor.trim())) throw new Error('Codex 模型目录响应无效');
  const data = input.data.map((item: any) => {
    if (!item || !text(item.id, '模型身份') || !text(item.model, '模型名称') || !text(item.displayName, '模型显示名称') || typeof item.description !== 'string' || typeof item.hidden !== 'boolean' || !Array.isArray(item.supportedReasoningEfforts) || item.serviceTiers !== undefined && !Array.isArray(item.serviceTiers)) throw new Error('Codex 模型条目无效');
    const efforts = item.supportedReasoningEfforts.map((effort: any) => ({ reasoningEffort: text(effort?.reasoningEffort, '推理档位'), description: description(effort?.description) }));
    const tiers = (item.serviceTiers ?? []).map((tier: any) => ({ id: text(tier?.id, '服务层级身份'), name: text(tier?.name, '服务层级名称'), description: description(tier?.description) }));
    if (item.multiAgentVersion != null && typeof item.multiAgentVersion !== 'string' || item.defaultServiceTier != null && typeof item.defaultServiceTier !== 'string') throw new Error('Codex 模型扩展字段无效');
    const upgradeInfo = readUpgrade(item);
    return { ...(upgradeInfo ? { upgradeInfo } : {}), id: item.id, model: item.model, displayName: item.displayName, description: item.description, hidden: item.hidden, supportedReasoningEfforts: efforts, serviceTiers: tiers, ...(item.multiAgentVersion != null ? { multiAgentVersion: item.multiAgentVersion } : {}), ...(item.defaultServiceTier != null ? { defaultServiceTier: item.defaultServiceTier } : {}) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
