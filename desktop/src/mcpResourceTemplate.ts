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

export function expandResourceTemplate(template: string, values: Record<string, string>): string {
  const context: Record<string, string> = Object.create(null);
  for (const name of resourceTemplateVariables(template)) {
    if (Object.hasOwn(values, name) && values[name] !== '') context[name] = values[name];
  }
  return parseTemplate(template).expand(context);
}
