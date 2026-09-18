// Keep malformed server fields out of rendering and persisted workspace state.
export function threadPage(value: any) {
  const data = value?.data ?? value?.threads;
  if (!Array.isArray(data) || (value.nextCursor != null && typeof value.nextCursor !== 'string')) throw Error('会话列表格式无效，请重试');
  return {
    nextCursor: value.nextCursor || undefined,
    data: data.filter(item => typeof item?.id === 'string' && item.id.trim()).map(item => ({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : undefined,
      preview: typeof item.preview === 'string' ? item.preview : undefined,
      cwd: typeof item.cwd === 'string' ? item.cwd : undefined,
      snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
      updatedAt: typeof item.updatedAt === 'number' || typeof item.updatedAt === 'string' ? item.updatedAt : 0,
      status: { type: typeof item.status?.type === 'string' ? item.status.type : undefined },
    })),
  };
}
