const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);
export type ThreadSectionAppearance = { icon?: string; color?: string };
export type ThreadSection = { id: string; name: string; appearance?: ThreadSectionAppearance };
const section = (id: string, name: string, value: any): ThreadSection => { const parsed = appearance(value); return { id, name, ...(parsed ? { appearance: parsed } : {}) }; };
const appearance = (value: any): ThreadSectionAppearance | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value) || value.icon != null && !id(value.icon) || value.color != null && (typeof value.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value.color))) throw new Error('分组外观无效');
  return { ...(value.icon != null ? { icon: value.icon } : {}), ...(value.color != null ? { color: value.color } : {}) };
};
export function readThreadSections(value: any): ThreadSection[] {
  if (!Array.isArray(value?.data)) throw new Error('分组列表无效');
  const seen = new Set<string>();
  return value.data.map((item: any) => { if (!id(item?.id) || !id(item?.name) || seen.has(item.id)) throw new Error('分组条目无效'); seen.add(item.id); return section(item.id, item.name, item.appearance); });
}
export function readThreadSection(value: any): ThreadSection {
  if (!id(value?.section?.id) || !id(value.section.name)) throw new Error('分组响应无效');
  return section(value.section.id, value.section.name, value.section.appearance);
}

export function readOptionalThreadSection(value: any): ThreadSection | undefined {
  if (value == null) return undefined;
  if (!id(value?.id) || !id(value?.name)) throw new Error('会话分组信息无效');
  return section(value.id, value.name, value.appearance);
}
