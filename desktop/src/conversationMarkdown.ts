import type { Thread } from './domain';

function block(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? 'null';
  const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(match => match[0].length + 1)));
  return `${fence}\n${text}\n${fence}`;
}
export function conversationMarkdown(thread: Thread, items?: any[]) {
  const title = thread.title.replace(/[\r\n]+/g, ' ');
  const metadata = [
    ['模型', thread.model], ['Provider', thread.providerId], ['推理强度', thread.reasoningEffort],
    ['执行模式', thread.planningMode === 'plan' ? '先规划' : thread.planningMode === 'default' ? '直接执行' : undefined],
    ['工作目录', thread.cwd], ['请求权限', thread.requestedPermission],
    ['实际沙箱', thread.effectivePermissions?.sandbox], ['审批策略', thread.effectivePermissions?.approvalPolicy],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1].trim())
    .map(([label, value]) => `- ${label}：${value.replace(/[\r\n]+/g, ' ')}`).join('\n');
  const intro = `# ${title}\n\n导出时间：${new Date().toISOString()}\n\n来源：${items ? '服务端完整分页记录' : '本机已加载记录（可能不完整）'}\n\n会话：${block(thread.remoteId || thread.id)}\n${metadata ? `\n配置摘要：\n${metadata}\n` : ''}`;
  const records = items ? items.filter(entry => entry && typeof entry === 'object' && !Array.isArray(entry)).map(entry => {
    const item = entry.item && typeof entry.item === 'object' && !Array.isArray(entry.item) ? entry.item : entry;
    if (!item || typeof item.type !== 'string') return `## 服务端记录\n\n${block(entry)}`;
    const label = item.type === 'userMessage' ? '用户' : item.type === 'agentMessage' ? '助手' : item.type;
    const content = item.type === 'agentMessage' ? (typeof item.text === 'string' ? item.text : block(item)) : item.type === 'userMessage'
      ? (Array.isArray(item.content) ? item.content : []).map((part: any) => part && typeof part === 'object' && part.type === 'text' ? (typeof part.text === 'string' ? part.text : block(part)) : block(part)).join('\n\n') : block(entry);
    return `## ${label}\n\n${content || ''}`;
  }) : thread.messages.map(message => `## ${{ user: '用户', assistant: '助手', system: '系统' }[message.role]}\n\n${message.content}${message.attachments?.length ? `\n\n附件路径（未嵌入文件）：\n${block(message.attachments)}` : ''}${message.skills?.length ? `\n\n技能：\n${block(message.skills)}` : ''}${message.plugins?.length ? `\n\n插件：\n${block(message.plugins)}` : ''}${message.tool ? `\n\n工具记录：\n${block(message.tool)}` : ''}`);
  return `${intro}\n${records.join('\n\n---\n\n')}\n`;
}

