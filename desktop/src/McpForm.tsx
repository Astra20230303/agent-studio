import { useRef, useState } from 'react';
export function McpForm({ request, onSubmit }: { request: any; onSubmit: (action: string, content?: Record<string, unknown>) => Promise<void> }) {
  const params = request.params || {};
  const schema = params.requestedSchema;
  const fields = Object.entries(schema?.properties || {}) as [string, any][];
  const supported = schema?.type === 'object' && fields.every(([, field]) => ['string', 'number', 'integer', 'boolean'].includes(field.type) && !field.oneOf && !field.anyOf);
  const [values, setValues] = useState<Record<string, any>>(() => Object.fromEntries(fields.filter(([, field]) => field.default !== undefined).map(([key, field]) => [key, field.default])));
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const send = async (action: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const content = Object.fromEntries(fields.filter(([key]) => values[key] !== undefined && values[key] !== '').map(([key, field]) => [key, ['number', 'integer'].includes(field.type) ? Number(values[key]) : values[key]]));
      await onSubmit(action, action === 'accept' ? content : undefined);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="approval-backdrop"><form className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="mcp-title" style={{ maxHeight: '85vh', overflow: 'auto' }} onSubmit={event => { event.preventDefault(); if (supported) void send('accept'); }}>
    <h2 id="mcp-title">{params.serverName || 'MCP'} 请求输入</h2><p>{params.message}</p>
    {!supported && <p role="alert">此表单格式尚未支持，请拒绝或取消请求。</p>}
    {supported && fields.map(([key, field]) => <label key={key} style={{ display: 'block', margin: '12px 0' }}>{field.title || key}{schema.required?.includes(key) ? ' *' : ''}{field.description && <small style={{ display: 'block' }}>{field.description}</small>}
      {field.type === 'boolean' ? <select aria-label={field.title || key} disabled={busy} required={schema.required?.includes(key)} value={values[key] === undefined ? '' : String(values[key])} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value === '' ? undefined : event.target.value === 'true' }))}><option value="">请选择</option><option value="true">是</option><option value="false">否</option></select>
      : Array.isArray(field.enum) ? <select aria-label={field.title || key} disabled={busy} required={schema.required?.includes(key)} value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))}><option value="">请选择</option>{field.enum.map((value: string, index: number) => <option key={value} value={value}>{field.enumNames?.[index] || value}</option>)}</select>
      : <input aria-label={field.title || key} disabled={busy} required={schema.required?.includes(key)} type={['integer', 'number'].includes(field.type) ? 'number' : field.format === 'email' ? 'email' : field.format === 'uri' ? 'url' : field.format === 'date' ? 'date' : 'text'} min={field.minimum} max={field.maximum} step={field.type === 'integer' ? 1 : 'any'} minLength={field.minLength} maxLength={field.maxLength} value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} />}
    </label>)}{error && <p role="alert">{error}</p>}<div className="approval-actions"><button disabled={busy} type="button" onClick={() => void send('cancel')}>取消</button><button disabled={busy} type="button" onClick={() => void send('decline')}>拒绝</button><button disabled={busy || !supported} type="submit">提交</button></div>
  </form></div>;
}
