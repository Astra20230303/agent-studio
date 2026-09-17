export function mcpOptions(field: any): { value: string; label: string }[] | undefined {
  if (!field || typeof field !== 'object') return;
  if (Array.isArray(field.enum) && field.enum.every((value: unknown) => typeof value === 'string')) {
    return field.enum.map((value: string, index: number) => ({ value, label: field.enumNames?.[index] || value }));
  }
  const alternatives = field.oneOf || field.anyOf;
  if (Array.isArray(alternatives) && alternatives.every(item => typeof item?.const === 'string')) {
    return alternatives.map(item => ({ value: item.const, label: item.title || item.const }));
  }
}
export function supportedMcpField(field: any): boolean {
  if (!field || typeof field !== 'object') return false;
  if (field.type === 'array') return !!mcpOptions(field.items);
  if (!['string', 'number', 'integer', 'boolean'].includes(field.type)) return false;
  if (field.oneOf || field.anyOf || field.enum) return field.type === 'string' && !!mcpOptions(field);
  return true;
}
