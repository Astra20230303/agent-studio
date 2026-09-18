const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);
export type ThreadSection = { id: string; name: string };
export function readThreadSections(value: any): ThreadSection[] {
  if (!Array.isArray(value?.data)) throw new Error('分组列表无效');
  const seen = new Set<string>();
  return value.data.map((item: any) => { if (!id(item?.id) || !id(item?.name) || seen.has(item.id)) throw new Error('分组条目无效'); seen.add(item.id); return { id: item.id, name: item.name }; });
}
export function readThreadSection(value: any): ThreadSection {
  if (!id(value?.section?.id) || !id(value.section.name)) throw new Error('分组响应无效');
  return { id: value.section.id, name: value.section.name };
}
