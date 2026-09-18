export function validateRestorableHistory(items: unknown): asserts items is any[] {
  const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
  if (!Array.isArray(items) || !items.every(entry => {
    if (!object(entry)) return false;
    const item = Object.hasOwn(entry, 'item') ? entry.item : entry;
    if (!object(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.type !== 'string' || !item.type.trim()) return false;
    if (entry.turnId != null && typeof entry.turnId !== 'string') return false;
    if (item.type === 'agentMessage' || item.type === 'plan') return typeof item.text === 'string';
    if (item.type === 'userMessage') {
      if (typeof item.text === 'string') return true;
      return Array.isArray(item.content) && item.content.every((part: any) => object(part) && typeof part.type === 'string' && (part.type !== 'text' || typeof part.text === 'string'));
    }
    return true;
  })) throw Error('服务端历史条目无效，已有消息已保留，请重试。');
}
