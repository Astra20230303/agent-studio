import { useState } from 'react';
import { expandResourceTemplate, parseResourceTemplateValue, resourceTemplateVariables, type ResourceTemplateValue, type ResourceTemplateValueKind } from './mcpResourceTemplate';
import type { McpResourceTemplate } from './McpResources';

export function McpResourceTemplateForm({ template, disabled, onRead }: {
  template: McpResourceTemplate; disabled: boolean; onRead: (uri: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [kinds, setKinds] = useState<Record<string, ResourceTemplateValueKind>>({});
  let variables: string[] = [], uri = '', templateError = '', error = '';
  try {
    variables = resourceTemplateVariables(template.uriTemplate);
  } catch (cause) { templateError = String(cause); }
  if (!templateError) {
    try {
      const parsed: Record<string, ResourceTemplateValue> = Object.create(null);
      for (const name of variables) {
        try {
          parsed[name] = parseResourceTemplateValue(Object.hasOwn(values, name) ? values[name] : '', Object.hasOwn(kinds, name) ? kinds[name] : 'text');
        } catch (cause) { throw new Error(`${name}: ${cause instanceof Error ? cause.message : String(cause)}`); }
      }
      uri = expandResourceTemplate(template.uriTemplate, parsed);
    } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
  return <details>
    <summary>{template.name}</summary>
    <p style={{ overflowWrap: 'anywhere' }}>{template.uriTemplate}</p>
    {template.description && <p>{template.description}</p>}
    {templateError ? <p role="alert">{templateError}</p> : <form onSubmit={event => { event.preventDefault(); if (!disabled && !error && uri.trim()) onRead(uri); }}>
      <p>选择文本、JSON 字符串数组或对象；留空的参数将省略。请核对生成的 URI 后读取。</p>
      {variables.map(name => <div key={name} style={{ overflowWrap: 'anywhere' }}><label>{name}
        <select aria-label={`${template.name} 参数 ${name} 类型`} value={Object.hasOwn(kinds, name) ? kinds[name] : 'text'} disabled={disabled}
          onChange={event => setKinds(previous => ({ ...previous, [name]: event.target.value as ResourceTemplateValueKind }))}>
          <option value="text">文本</option><option value="array">JSON 字符串数组</option><option value="object">JSON 字符串对象</option>
        </select></label><label>{name} 值
        <input aria-label={`${template.name} 参数 ${name}`} value={Object.hasOwn(values, name) ? values[name] : ''} disabled={disabled}
          onChange={event => setValues(previous => ({ ...previous, [name]: event.target.value }))} />
      </label></div>)}
      {error ? <p role="alert">{error}</p> : <p aria-label={`${template.name} 生成的 URI`} style={{ overflowWrap: 'anywhere' }}>{uri}</p>}
      <button type="submit" disabled={disabled || !!error || !uri.trim()}>读取 {template.name} 模板资源</button>
    </form>}
  </details>;
}
