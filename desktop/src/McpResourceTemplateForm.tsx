import { useState } from 'react';
import { expandResourceTemplate, resourceTemplateVariables } from './mcpResourceTemplate';
import type { McpResourceTemplate } from './McpResources';

export function McpResourceTemplateForm({ template, disabled, onRead }: {
  template: McpResourceTemplate; disabled: boolean; onRead: (uri: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  let variables: string[] = [], uri = '', error = '';
  try {
    variables = resourceTemplateVariables(template.uriTemplate);
    uri = expandResourceTemplate(template.uriTemplate, values);
  } catch (cause) { error = String(cause); }
  return <details>
    <summary>{template.name}</summary>
    <p style={{ overflowWrap: 'anywhere' }}>{template.uriTemplate}</p>
    {template.description && <p>{template.description}</p>}
    {error ? <p role="alert">{error}</p> : <form onSubmit={event => { event.preventDefault(); if (!disabled && uri.trim()) onRead(uri); }}>
      <p>填写文本参数；留空的参数将省略。请核对生成的 URI 后读取。</p>
      {variables.map(name => <label key={name} style={{ display: 'block', overflowWrap: 'anywhere' }}>{name}
        <input aria-label={`${template.name} 参数 ${name}`} value={Object.hasOwn(values, name) ? values[name] : ''} disabled={disabled}
          onChange={event => setValues(previous => ({ ...previous, [name]: event.target.value }))} />
      </label>)}
      <p aria-label={`${template.name} 生成的 URI`} style={{ overflowWrap: 'anywhere' }}>{uri}</p>
      <button type="submit" disabled={disabled || !uri.trim()}>读取 {template.name} 模板资源</button>
    </form>}
  </details>;
}
