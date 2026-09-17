import { useCallback, useEffect, useRef, useState } from 'react';
import { extensionRequest } from './extensions';

type Server = { name: string; runtimeStatus?: string; authStatus: string; tools?: Record<string, { description?: string }>; toolsError?: string };
const labels: Record<string, string> = { connected: '已连接', starting: '正在启动', failed: '连接失败', disabled: '已禁用', cancelled: '已取消', notStarted: '未启动', authenticationRequired: '需要认证', notLoggedIn: '未登录', oAuth: 'OAuth 已登录', bearerToken: '令牌认证', unsupported: '无需 OAuth', unknown: '未知' };
export function McpServers({ connected, threadId, onBack }: { connected: boolean; threadId?: string; onBack: () => void }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const busy = loading || acting;
  const [notice, setNotice] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    if (!connected) { setServers([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const all: Server[] = []; let cursor: string | undefined; const seen = new Set<string>();
      do {
        const result = await extensionRequest<{ data: Server[]; nextCursor?: string }>('mcpServerStatus/list', { threadId, cursor, limit: 100, detail: 'toolsAndAuthOnly' });
        if (token !== generation.current) return;
        all.push(...result.data); cursor = result.nextCursor || undefined;
        if (cursor && seen.has(cursor)) throw Error('MCP 分页游标重复，请重试');
        if (cursor) seen.add(cursor);
      } while (cursor);
      setServers(all);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) setLoading(false); }
  }, [connected, threadId]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  useEffect(() => { setLinks({}); setNotice(''); }, [connected, threadId]);
  useEffect(() => window.codex?.onNotification((event: any) => {
    if (event.method !== 'mcpServer/oauthLogin/completed' || (event.params.threadId || undefined) !== threadId) return;
    const result = event.params;
    setLinks(current => { const next = { ...current }; delete next[result.name]; return next; });
    setNotice(result.success ? `${result.name} 登录成功` : `${result.name} 登录失败：${result.error || '请重试'}`);
    void refresh();
  }), [refresh, threadId]);
  const action = async (name?: string) => {
    if (lock.current || !connected) return;
    const token = generation.current;
    lock.current = true; setActing(true); setError('');
    try {
      if (name) {
        const result = await extensionRequest<{ authorizationUrl: string }>('mcpServer/oauth/login', { name, threadId });
        if (token !== generation.current) return;
        const url = new URL(result.authorizationUrl);
        if (!['https:', 'http:'].includes(url.protocol)) throw Error('不支持的登录链接');
        setLinks(current => ({ ...current, [name]: url.href }));
        setNotice('请在浏览器完成登录，然后返回此处。');
      } else { await extensionRequest('config/mcpServer/reload', {}); if (token !== generation.current) return; setNotice('已请求重新加载 MCP 配置'); await refresh(); }
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { lock.current = false; setActing(false); }
  };
  return <section className="extensions"><div className="ext-scroll"><div className="ext-content">
    <button onClick={onBack}>返回扩展</button><h1>MCP 服务</h1>
    <button disabled={!connected || busy} onClick={() => void refresh()}>刷新 MCP 状态</button> <button disabled={!connected || busy} onClick={() => void action()}>重新加载 MCP 配置</button>
    {!connected && <p role="status">等待 app-server 连接</p>}{busy && <p role="status">正在处理…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {servers.map(server => <section className="page-card" key={server.name} aria-label={server.name}><h2>{server.name}</h2><p>连接：{labels[server.runtimeStatus || 'unknown'] || server.runtimeStatus} · 认证：{labels[server.authStatus] || server.authStatus}</p>
      {server.toolsError && <p role="alert">工具发现失败：{server.toolsError}</p>}
      {server.authStatus !== 'unsupported' && <button disabled={!connected || busy} onClick={() => void action(server.name)}>登录 {server.name}</button>}
      {links[server.name] && <button onClick={() => { const open = window.desktop?.openExternal; if (!open) { setError('无法打开系统浏览器'); return; } void open(links[server.name]).catch(error => setError(String(error))); }}>打开 {server.name} 登录页面</button>}
      <details><summary>工具 ({Object.keys(server.tools || {}).length})</summary>{Object.entries(server.tools || {}).map(([name, tool]) => <p key={name}><strong>{name}</strong> {tool.description}</p>)}</details>
    </section>)}{connected && !busy && !error && !servers.length && <p>暂无 MCP 服务。</p>}
  </div></div></section>;
}
