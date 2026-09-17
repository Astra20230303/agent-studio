import { useEffect, useRef, useState } from 'react';
import { extensionRequest } from './extensions';
import { ToolResult } from './ToolResult';

export type McpResource = { uri: string; name: string; title?: string; description?: string };
export type McpResourceTemplate = { uriTemplate: string; name: string; description?: string };
type Content = { uri: string; text?: string; blob?: string; mimeType?: string };
export function McpResources({ server, resources, templates, threadId, disabled }: {
  server: string; resources: McpResource[]; templates: McpResourceTemplate[]; threadId?: string; disabled: boolean;
}) {
  const [uri, setUri] = useState('');
  const [contents, setContents] = useState<Content[]>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++; setContents(undefined); setError(''); setLoading(false);
    return () => { generation.current++; };
  }, [server, resources, threadId, disabled]);
  const read = async (value: string) => {
    const requested = value.trim();
    if (!requested || disabled) return;
    const token = ++generation.current;
    setUri(requested); setLoading(true); setError(''); setContents(undefined);
    try {
      const result = await extensionRequest<{ contents: Content[] }>('mcpServer/resource/read', { server, threadId, uri: requested });
      if (token === generation.current) setContents(result.contents);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) setLoading(false); }
  };
  return <div aria-label={`${server} 资源`}>
    <h3>资源 ({resources.length})</h3>
    {resources.map(resource => <div key={resource.uri}><button disabled={disabled || loading} onClick={() => void read(resource.uri)}>{resource.title || resource.name}</button><p style={{ overflowWrap: 'anywhere' }}>{resource.uri}</p>{resource.description && <p>{resource.description}</p>}</div>)}
    {templates.length > 0 && <details><summary>资源模板 ({templates.length})</summary>{templates.map(template => <p key={template.uriTemplate} style={{ overflowWrap: 'anywhere' }}>{template.name}: {template.uriTemplate} {template.description}</p>)}</details>}
    <form onSubmit={event => { event.preventDefault(); void read(uri); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input aria-label={`${server} 资源 URI`} value={uri} onChange={event => setUri(event.target.value)} placeholder="资源 URI" style={{ flex: '1 1 200px', minWidth: 0 }} />
      <button disabled={disabled || loading || !uri.trim()} type="submit">读取资源</button>
    </form>
    {loading && <p role="status">正在读取资源…</p>}
    {error && <p role="alert">{error}</p>}
    {contents && <div aria-label="资源内容">{contents.length === 0 && <p>资源内容为空。</p>}{contents.map((content, index) => <div key={index}><p style={{ overflowWrap: 'anywhere' }}>{content.uri}</p><ToolResult result={{ content: [typeof content.text === 'string' ? { type: 'text', text: content.text } : { type: content.mimeType?.startsWith('audio/') ? 'audio' : 'image', mimeType: content.mimeType, data: content.blob }] }} /></div>)}</div>}
  </div>;
}
