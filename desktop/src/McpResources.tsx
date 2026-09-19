import { McpResourceDownload } from './McpResourceDownload';
import { McpResourceTemplateForm } from './McpResourceTemplateForm';
import { readMcpResourceContent, type McpResourceContent } from './mcpResourceContent';
import { useEffect, useRef, useState } from 'react';
import { extensionRequest } from './extensions';
import { ToolResult } from './ToolResult';

export type McpResource = { uri: string; name: string; title?: string; description?: string };
export type McpResourceTemplate = { uriTemplate: string; name: string; description?: string };

export function McpResources({ server, resources, templates, threadId, disabled, onAddToDraft }: {
  server: string; resources: McpResource[]; templates: McpResourceTemplate[]; threadId?: string; disabled: boolean; onAddToDraft?: (text: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [uri, setUri] = useState('');
  const [contents, setContents] = useState<McpResourceContent[]>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++; setContents(undefined); setError(''); setLoading(false); setCancelled(false);
    return () => { generation.current++; };
  }, [server, resources, threadId, disabled]);
  const read = async (value: string) => {
    const requested = value.trim();
    if (!requested || disabled) return;
    const token = ++generation.current;
    setCancelled(false); setUri(requested); setLoading(true); setError(''); setContents(undefined);
    try {
      const result = readMcpResourceContent(await extensionRequest<unknown>('mcpServer/resource/read', { server, threadId, uri: requested }));
      if (token === generation.current) setContents(result);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) setLoading(false); }
  };
  const needle = query.trim().toLocaleLowerCase();
  const matches = (...fields: (string | undefined)[]) => fields.some(field => field?.toLocaleLowerCase().includes(needle));
  const visibleResources = resources.filter(resource => matches(resource.name, resource.title, resource.description, resource.uri));
  const visibleTemplates = templates.filter(template => matches(template.name, template.description, template.uriTemplate));
  return <div aria-label={`${server} 资源`}>
    <h3>资源 ({resources.length})</h3>
    <label>搜索资源和模板<input type="search" aria-label={`${server} 搜索资源和模板`} placeholder="名称、描述或 URI" value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim()) setTemplatesOpen(true); }} /></label>
    {query && <button type="button" onClick={() => setQuery('')}>清空 {server} 资源搜索</button>}
    {needle && <p role="status">匹配资源 {visibleResources.length}/{resources.length} · 模板 {visibleTemplates.length}/{templates.length}</p>}
    {needle && visibleResources.length === 0 && visibleTemplates.length === 0 && <p role="status">没有匹配的资源或模板，仍可手动输入 URI 读取。</p>}
    {visibleResources.map(resource => <div key={resource.uri}><button disabled={disabled || loading} onClick={() => void read(resource.uri)}>{resource.title || resource.name}</button><p style={{ overflowWrap: 'anywhere' }}>{resource.uri}</p>{resource.description && <p>{resource.description}</p>}</div>)}
    {templates.length > 0 && <details open={templatesOpen} onToggle={event => setTemplatesOpen(event.currentTarget.open)}><summary>资源模板 ({templates.length})</summary>{templates.map(template => <div key={`${server}:${threadId}:${template.uriTemplate}`} hidden={!visibleTemplates.includes(template)}><McpResourceTemplateForm template={template} disabled={disabled || loading} onRead={value => void read(value)} /></div>)}</details>}
    <form onSubmit={event => { event.preventDefault(); void read(uri); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input aria-label={`${server} 资源 URI`} value={uri} onChange={event => setUri(event.target.value)} placeholder="资源 URI" style={{ flex: '1 1 200px', minWidth: 0 }} />
      <button disabled={disabled || loading || !uri.trim()} type="submit">读取资源</button>
    </form>
    {loading && <div><p role="status">正在读取资源…</p><button type="button" onClick={() => {
      generation.current++; setLoading(false); setContents(undefined); setError(''); setCancelled(true);
    }}>取消等待读取</button></div>}
    {cancelled && <p role="status">已取消等待，可以读取其他资源。服务端读取可能仍在进行，返回结果将被忽略。</p>}
    {error && <p role="alert">{error}</p>}
    {contents && <div aria-label="资源内容">{contents.length === 0 && <p>资源内容为空。</p>}{contents.map((content, index) => <div key={index}><p style={{ overflowWrap: 'anywhere' }}>{content.uri}</p>{onAddToDraft && typeof content.text === 'string' && <button disabled={disabled || loading} onClick={() => onAddToDraft(`MCP resource snapshot:\n${JSON.stringify({ server, uri: content.uri, mimeType: content.mimeType, text: content.text }, null, 2)}`)}>加入聊天草稿</button>}{typeof content.blob === 'string' && <McpResourceDownload uri={content.uri} blob={content.blob} />}<ToolResult result={{ content: [typeof content.text === 'string' ? { type: 'text', text: content.text } : { type: content.mimeType?.startsWith('audio/') ? 'audio' : content.mimeType?.startsWith('image/') ? 'image' : 'resource', mimeType: content.mimeType, data: content.blob }] }} /></div>)}</div>}
  </div>;
}
