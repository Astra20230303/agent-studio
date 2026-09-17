import { useState } from 'react';
import { CopyText } from './CopyText';
import type { ToolActivity } from './domain';

function WebLink({ url, title }: { url: string; title: string }) {
  const [error, setError] = useState('');
  let valid = false;
  try { const parsed = new URL(url); valid = ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { /* Unrecognized URLs remain text. */ }
  if (!valid) return <span>{title} {url}</span>;
  return <><a href={url} target="_blank" rel="noreferrer" onClick={event => {
    if (window.desktop?.openExternal) { event.preventDefault(); setError(''); void window.desktop.openExternal(url).catch(() => setError('无法打开链接，请重试。')); }
  }}>{title || url}</a>{error && <span role="alert">{error}</span>}</>;
}

export function WebSearchActivity({ tool }: { tool: ToolActivity }) {
  const item = tool.rawRecord?.item || {};
  const action = item.action && typeof item.action === 'object' ? item.action as Record<string, unknown> : {};
  const label = action.type === 'openPage' ? '打开网页' : action.type === 'findInPage' ? '页内查找' : '网页搜索';
  const queries = [...new Set([item.query, action.query, ...(Array.isArray(action.queries) ? action.queries : [])].filter((value): value is string => typeof value === 'string' && Boolean(value)))];
  const results = Array.isArray(item.results) ? item.results : [];
  return <details className="tool-row"><summary>{label} · {tool.status === 'inProgress' ? '进行中' : tool.status === 'completed' ? '已完成' : tool.status}</summary><div className="tool-detail">
    {queries.map(query => <p key={query}>{query}</p>)}
    {typeof action.url === 'string' && <p><WebLink url={action.url} title={action.url} /></p>}
    {typeof action.pattern === 'string' && <p>查找：{action.pattern}</p>}
    {results.map((value, index) => {
      const result = value && typeof value === 'object' ? value as Record<string, unknown> : {};
      return <div key={index}>{typeof result.url === 'string' ? <p><WebLink url={result.url} title={typeof result.title === 'string' ? result.title : result.url} /></p> : null}{typeof result.snippet === 'string' && <p>{result.snippet}</p>}</div>;
    })}
    <details><summary>原始搜索记录</summary><CopyText source={JSON.stringify(item, null, 2)} label="复制搜索记录" /><pre className="tool-output">{JSON.stringify(item, null, 2)}</pre></details>
  </div></details>;
}
