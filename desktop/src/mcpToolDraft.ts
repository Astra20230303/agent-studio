import type { McpToolInfo } from './mcpStatus';
export function mcpToolDraft(server: string, key: string, tool: McpToolInfo): string {
  return `请使用以下 MCP 工具完成我的任务。请先核对参数，缺少必要信息时向我询问。\n${JSON.stringify({ server, tool: tool.name || key, ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}) }, null, 2)}\n\n任务：`;
}
