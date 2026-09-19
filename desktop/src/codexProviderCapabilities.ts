export type CodexProviderCapabilities = { namespaceTools: boolean; imageGeneration: boolean; webSearch: boolean };
export function readCodexProviderCapabilities(value: unknown): CodexProviderCapabilities {
  const input = value as any;
  if (!input || typeof input.namespaceTools !== 'boolean' || typeof input.imageGeneration !== 'boolean' || typeof input.webSearch !== 'boolean') throw new Error('Codex 模型渠道能力响应无效');
  return { namespaceTools: input.namespaceTools, imageGeneration: input.imageGeneration, webSearch: input.webSearch };
}
