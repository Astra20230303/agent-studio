export type McpResourceContent = { uri: string; text?: string; blob?: string; mimeType?: string };
export function readMcpResourceContent(value: unknown): McpResourceContent[] {
  const result = value as { contents?: unknown } | null;
  if (!result || !Array.isArray(result.contents)) throw Error('MCP 资源响应格式无效，请重试。');
  return result.contents.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.uri !== 'string' || !item.uri.trim()
      || item.mimeType != null && typeof item.mimeType !== 'string'
      || (typeof item.text !== 'string' && typeof item.blob !== 'string')
      || item.text != null && typeof item.text !== 'string' || item.blob != null && typeof item.blob !== 'string') throw Error('MCP 资源内容格式无效，请重试。');
    return { uri: item.uri, ...(typeof item.text === 'string' ? { text: item.text } : { blob: item.blob }), ...(typeof item.mimeType === 'string' ? { mimeType: item.mimeType } : {}) };
  });
}
