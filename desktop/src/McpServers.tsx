import { mcpToolHints } from './mcpToolHints';
import { readMcpStartup, mcpStartupText, type McpStartup } from './mcpStartup';
import { useCallback, useEffect, useRef, useState } from 'react';
import { extensionRequest } from './extensions';
import { McpResources, type McpResource, type McpResourceTemplate } from './McpResources';
import { CopyText } from './CopyText';
import { parseMcpStatusPage, type McpToolInfo } from './mcpStatus';

type Server = { name: string; runtimeStatus?: string; authStatus: string; tools?: Record<string, McpToolInfo>; toolsError?: string; resources?: McpResource[]; resourceTemplates?: McpResourceTemplate[] };
const emptyResources: McpResource[] = [];
const emptyTemplates: McpResourceTemplate[] = [];
const labels: Record<string, string> = { connected: '已连接', starting: '正在启动', failed: '连接失败', disabled: '已禁用', cancelled: '已取消', notStarted: '未启动', authenticationRequired: '需要认证', notLoggedIn: '未登录', oAuth: 'OAuth 已登录', bearerToken: '令牌认证', unsupported: '无需 OAuth', unknown: '未知' };
export function McpServers({ connected, threadId, onBack, onAddToDraft }: { connected: boolean; threadId?: string; onBack: () => void; onAddToDraft?: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [startup, setStartup] = useState<Record<string, McpStartup>>({});
  const [servers, setServers] = useState<Server[]>([]);
  const [includeResources, setIncludeResources] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const busy = loading || acting;
  const [notice, setNotice] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const lock = useRef(false);
  const actionGeneration = useRef(0);
  const oauthCompletions = useRef(new Map<string, number>());
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    if (!connected) { setServers([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const all: Server[] = []; let cursor: string | undefined; const seen = new Set<string>();
      do {
        const result = parseMcpStatusPage(await extensionRequest<unknown>('mcpServerStatus/list', { threadId, cursor, limit: 100, detail: includeResources ? 'full' : 'toolsAndAuthOnly' }));
        if (token !== generation.current) return;
        all.push(...result.data); cursor = result.nextCursor || undefined;
        if (cursor && seen.has(cursor)) throw Error('MCP 分页游标重复，请重试');
        if (cursor) seen.add(cursor);
      } while (cursor);
      setServers(all);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) setLoading(false); }
  }, [connected, threadId, includeResources]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  useEffect(() => { actionGeneration.current++; lock.current = false; setActing(false); oauthCompletions.current.clear(); setLinks({}); setNotice(''); setStartup({}); return () => { actionGeneration.current++; }; }, [connected, threadId]);
  useEffect(() => window.codex?.onNotification((event: any) => {
    if (!connected) return;
    if (event.method === 'mcpServer/startupStatus/updated') {
      const value = readMcpStartup(event.params, threadId);
      if (!value) return;
      setStartup(current => ({ ...current, [value.name]: value }));
      if (value.status === 'ready') void refresh();
      return;
    }
    if (event.method !== 'mcpServer/oauthLogin/completed' || (event.params?.threadId || undefined) !== threadId) return;
    const result = event.params;
    if (!result || typeof result.name !== 'string' || !result.name.trim() || typeof result.success !== 'boolean' || result.error != null && typeof result.error !== 'string') return;
    oauthCompletions.current.set(result.name, (oauthCompletions.current.get(result.name) || 0) + 1);
    setLinks(current => { const next = { ...current }; delete next[result.name]; return next; });
    setNotice(result.success ? `${result.name} 登录成功` : `${result.name} 登录失败：${result.error || '请重试'}`);
    void refresh();
  }), [connected, refresh, threadId]);
  const action = async (name?: string) => {
    if (lock.current || !connected) return;
    const token = actionGeneration.current;
    const completion = name ? oauthCompletions.current.get(name) || 0 : 0;
    lock.current = true; setActing(true); setError('');
    try {
      if (name) {
        const result = await extensionRequest<{ authorizationUrl: string }>('mcpServer/oauth/login', { name, threadId });
        if (token !== actionGeneration.current) return;
        if ((oauthCompletions.current.get(name) || 0) !== completion) return;
        const url = new URL(result.authorizationUrl);
        if (!['https:', 'http:'].includes(url.protocol)) throw Error('不支持的登录链接');
        setLinks(current => ({ ...current, [name]: url.href }));
        setNotice('请在浏览器完成登录，然后返回此处。');
      } else { await extensionRequest('config/mcpServer/reload', {}); if (token !== actionGeneration.current) return; setNotice('已请求重新加载 MCP 配置'); await refresh(); }
    } catch (error) { if (token === actionGeneration.current && (!name || (oauthCompletions.current.get(name) || 0) === completion)) setError(String(error)); }
    finally { if (token === actionGeneration.current) { lock.current = false; setActing(false); } }
  };
  const needle = query.trim().toLocaleLowerCase();
  const visible = servers.map(server => {
    const serverMatches = server.name.toLocaleLowerCase().includes(needle);
    const tools = Object.entries(server.tools || {}).filter(([name, tool]) => serverMatches || `${name} ${tool.description || ''}`.toLocaleLowerCase().includes(needle));
    return { server, tools, matches: serverMatches || tools.length > 0 };
  }).filter(item => item.matches);
  return <section className="extensions"><div className="ext-scroll"><div className="ext-content">
    <button onClick={onBack}>返回扩展</button><h1>MCP 服务</h1>
    <button disabled={!connected || busy} onClick={() => void refresh()}>刷新 MCP 状态</button> <button disabled={!connected || busy} onClick={() => void action()}>重新加载 MCP 配置</button>
    <label>搜索服务和工具<input type="search" aria-label="搜索 MCP 服务和工具" placeholder="服务名、工具名或描述" value={query} onChange={event => setQuery(event.target.value)} /></label>{query && <button onClick={() => setQuery('')}>清空 MCP 搜索</button>}
    <label><input type="checkbox" checked={includeResources} disabled={!connected || busy} onChange={event => setIncludeResources(event.target.checked)} />显示资源目录</label>
    {!connected && <p role="status">等待 app-server 连接</p>}{busy && <p role="status">正在处理…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {Object.values(startup).length > 0 && <section aria-label="MCP 启动通知">{Object.values(startup).map(value => <p key={value.name} role={value.status === 'failed' ? 'alert' : 'status'} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{mcpStartupText(value)}</p>)}</section>}
    {visible.map(({ server, tools }) => <section className="page-card" key={server.name} aria-label={server.name}><h2>{server.name}</h2><p>连接：{labels[server.runtimeStatus || 'unknown'] || server.runtimeStatus} · 认证：{labels[server.authStatus] || server.authStatus}</p>
      {server.toolsError && <p role="alert">工具发现失败：{server.toolsError}</p>}
      {server.authStatus !== 'unsupported' && <button disabled={!connected || busy} onClick={() => void action(server.name)}>登录 {server.name}</button>}
      {links[server.name] && <button onClick={() => { const open = window.desktop?.openExternal; if (!open) { setError('无法打开系统浏览器'); return; } void open(links[server.name]).catch(error => setError(String(error))); }}>打开 {server.name} 登录页面</button>}
      <details key={needle ? 'search' : 'browse'} open={needle ? true : undefined}><summary>工具 ({tools.length})</summary>{tools.map(([name, tool]) => <div key={name}><p><strong>{name}</strong> {tool.description}</p>{mcpToolHints(tool.annotations).length > 0 && <p><small>服务端声明（不代表权限限制）：{mcpToolHints(tool.annotations).join(' · ')}</small></p>}{(['inputSchema', 'outputSchema'] as const).filter(key => tool[key] != null).map(key => <details key={key}><summary>{name} · {key === 'inputSchema' ? '输入参数' : '输出结构'}</summary><CopyText source={JSON.stringify(tool[key], null, 2)} label={`复制 ${name} ${key === 'inputSchema' ? '输入参数' : '输出结构'}`} /><pre style={{ maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(tool[key], null, 2)}</pre></details>)}</div>)}</details>
      {includeResources && <McpResources key={`${server.name}:${threadId || ''}`} server={server.name} threadId={threadId} resources={server.resources || emptyResources} templates={server.resourceTemplates || emptyTemplates} disabled={!connected || busy} onAddToDraft={onAddToDraft} />}
    </section>)}{needle && servers.length > 0 && !visible.length && <p role="status">没有匹配的 MCP 服务或工具。</p>}{connected && !busy && !error && !servers.length && <p>暂无 MCP 服务。</p>}
  </div></div></section>;
}
