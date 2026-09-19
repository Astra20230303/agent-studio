export type CodexModel = { id: string; model: string; displayName: string; description: string; hidden: boolean; supportedReasoningEfforts: { reasoningEffort: string; description: string }[]; multiAgentVersion?: string; serviceTiers: { id: string; name: string; description: string }[]; defaultServiceTier?: string };
const text = (value: unknown, label: string): string => { if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error(`${label} 无效`); return value; };
export function readCodexModelPage(value: unknown): { data: CodexModel[]; nextCursor?: string } {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.data.length > 500 || input.nextCursor != null && (typeof input.nextCursor !== 'string' || !input.nextCursor.trim())) throw new Error('Codex 模型目录响应无效');
  const data = input.data.map((item: any) => {
    if (!item || !text(item.id, '模型身份') || !text(item.model, '模型名称') || !text(item.displayName, '模型显示名称') || typeof item.description !== 'string' || typeof item.hidden !== 'boolean' || !Array.isArray(item.supportedReasoningEfforts) || !Array.isArray(item.serviceTiers)) throw new Error('Codex 模型条目无效');
    const efforts = item.supportedReasoningEfforts.map((effort: any) => ({ reasoningEffort: text(effort?.reasoningEffort, '推理档位'), description: text(effort?.description, '推理档位描述') }));
    const tiers = item.serviceTiers.map((tier: any) => ({ id: text(tier?.id, '服务层级身份'), name: text(tier?.name, '服务层级名称'), description: text(tier?.description, '服务层级描述') }));
    if (item.multiAgentVersion != null && typeof item.multiAgentVersion !== 'string' || item.defaultServiceTier != null && typeof item.defaultServiceTier !== 'string') throw new Error('Codex 模型扩展字段无效');
    return { id: item.id, model: item.model, displayName: item.displayName, description: item.description, hidden: item.hidden, supportedReasoningEfforts: efforts, serviceTiers: tiers, ...(item.multiAgentVersion != null ? { multiAgentVersion: item.multiAgentVersion } : {}), ...(item.defaultServiceTier != null ? { defaultServiceTier: item.defaultServiceTier } : {}) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
