import type { McpResource, McpResourceTemplate } from './McpResources';
export type McpToolInfo = { description?: string; inputSchema?: Record<string, unknown>; outputSchema?: Record<string, unknown> };
export type McpStatusPage = {
  data: Array<{ name: string; runtimeStatus?: string; authStatus: string; tools?: Record<string, McpToolInfo>; toolsError?: string; resources?: McpResource[]; resourceTemplates?: McpResourceTemplate[] }>;
  nextCursor?: string;
};

const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function parseMcpStatusPage(value: unknown): McpStatusPage {
  if (!object(value) || !Array.isArray(value.data) || value.nextCursor != null && (typeof value.nextCursor !== 'string' || !value.nextCursor.trim())) throw Error('MCP 状态列表格式无效，请重试');
  const names = new Set<string>();
  const data = value.data.map((server: any) => {
    if (!object(server) || typeof server.name !== 'string' || !server.name.trim() || names.has(server.name)
      || typeof server.authStatus !== 'string' || server.runtimeStatus != null && typeof server.runtimeStatus !== 'string'
      || server.toolsError != null && typeof server.toolsError !== 'string'
      || server.tools != null && (!object(server.tools) || Object.entries(server.tools).some(([name, tool]: any) => !name || !object(tool) || tool.description != null && typeof tool.description !== 'string' || tool.inputSchema != null && !object(tool.inputSchema) || tool.outputSchema != null && !object(tool.outputSchema)))
      || server.resources != null && (!Array.isArray(server.resources) || server.resources.some((item: any) => !object(item) || typeof item.uri !== 'string' || !item.uri.trim() || typeof item.name !== 'string' || !item.name.trim() || item.title != null && typeof item.title !== 'string' || item.description != null && typeof item.description !== 'string'))
      || server.resourceTemplates != null && (!Array.isArray(server.resourceTemplates) || server.resourceTemplates.some((item: any) => !object(item) || typeof item.uriTemplate !== 'string' || !item.uriTemplate.trim() || typeof item.name !== 'string' || !item.name.trim() || item.description != null && typeof item.description !== 'string'))) throw Error('MCP 状态条目格式无效，请重试');
    names.add(server.name);
    return structuredClone(server);
  });
  return { data: data as McpStatusPage['data'], nextCursor: value.nextCursor || undefined };
}
