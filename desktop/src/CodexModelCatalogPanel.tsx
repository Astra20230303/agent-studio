import { useEffect, useRef, useState } from 'react';
import { listCodexModels } from './codexClient';
import type { CodexModel } from './codexModelCatalog';
export function CodexModelCatalogPanel({ connected, busy }: { connected: boolean; busy?: boolean }) {
  const [models, setModels] = useState<CodexModel[]>([]); const [includeHidden, setIncludeHidden] = useState(false); const [loading, setLoading] = useState(false); const [notice, setNotice] = useState('');
  const generation = useRef(0); const lock = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const reset = () => { generation.current++; lock.current = false; setLoading(false); setModels([]); setLoaded(false); setNotice(''); };
  useEffect(() => { reset(); return () => { generation.current++; }; }, [connected]);
  const load = async () => {
    if (!connected || busy || lock.current) return;
    const ticket = generation.current;
    lock.current = true; setLoading(true); setNotice(''); setModels([]); setLoaded(false);
    try { const result = await listCodexModels(includeHidden); if (ticket === generation.current) { setModels(result); setLoaded(true); } }
    catch (error) { if (ticket === generation.current) setNotice(`读取 Codex 模型目录失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { if (ticket === generation.current) { lock.current = false; setLoading(false); } }
  };
  return <section className="settings-card" aria-label="Codex 模型目录"><h2>Codex 模型目录</h2><p>读取 app-server 提供的模型描述、推理档位和服务层级。</p><label><input type="checkbox" checked={includeHidden} onChange={event => { reset(); setIncludeHidden(event.target.checked); }} />包含隐藏模型</label><button disabled={!connected || busy || loading} onClick={() => void load()}>{loading ? '读取中…' : '刷新模型目录'}</button>{notice && <p role="alert">{notice}</p>}{loaded && models.length === 0 && <p role="status">没有可用模型</p>}{models.length > 0 && <ul>{models.map(model => <li key={model.id}><strong>{model.displayName}</strong> · {model.model}{model.hidden ? ' · 隐藏' : ''}<p>{model.description}</p><small>推理：{model.supportedReasoningEfforts.map(effort => effort.reasoningEffort).join('、') || '未提供'} · 多 Agent：{model.multiAgentVersion || '未提供'}{model.serviceTiers.length ? ` · 服务层级：${model.serviceTiers.map(tier => tier.name).join('、')}` : ''}</small></li>)}</ul>}</section>;
}
