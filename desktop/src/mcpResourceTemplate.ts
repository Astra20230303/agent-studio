import { parseTemplate } from 'url-template';

// Validate expression syntax before asking the RFC 6570 expander to render it.
export function resourceTemplateVariables(template: string): string[] {
  const variables = new Set<string>();
  const literal = template.replace(/\{([^{}]*)\}/g, (_match, expression: string) => {
    const body = expression.replace(/^[+#./;?&]/, '');
    for (const spec of body.split(',')) {
      const match = /^((?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+(?:\.(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+)*)(?:\*|:[1-9][0-9]{0,3})?$/.exec(spec);
      if (!match) throw new Error('资源模板格式无效，请手动填写资源 URI。');
      variables.add(match[1]);
    }
    return '';
  });
  if (/[{}]/.test(literal) || !template.trim()) throw new Error('资源模板格式无效，请手动填写资源 URI。');
  return [...variables];
}

export type ResourceTemplateValue = string | string[] | Record<string, string>;
export type ResourceTemplateValueKind = 'text' | 'array' | 'object';

export function parseResourceTemplateValue(input: string, kind: ResourceTemplateValueKind): ResourceTemplateValue {
  if (kind === 'text' || input === '') return input;
  let value: unknown;
  try { value = JSON.parse(input); } catch { throw new Error('请输入有效 JSON。'); }
  if (kind === 'array' && Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
  if (kind === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(item => typeof item === 'string')) return value as Record<string, string>;
  throw new Error(kind === 'array' ? '请输入 JSON 字符串数组，例如 ["a","b"]。' : '请输入值均为字符串的 JSON 对象，例如 {"key":"value"}。');
}

export function expandResourceTemplate(template: string, values: Record<string, ResourceTemplateValue>): string {
  const context: Record<string, ResourceTemplateValue> = Object.create(null);
  for (const name of resourceTemplateVariables(template)) {
    if (Object.hasOwn(values, name) && values[name] !== '') context[name] = values[name];
  }
  for (const expression of template.matchAll(/\{([^{}]*)\}/g)) {
    for (const spec of expression[1].replace(/^[+#./;?&]/, '').split(',')) {
      const [name, prefix] = spec.split(':');
      if (prefix && Object.hasOwn(context, name) && typeof context[name] !== 'string') throw new Error(`参数 ${name} 使用前缀长度，只能填写文本。`);
    }
  }
  return parseTemplate(template).expand(context);
}
