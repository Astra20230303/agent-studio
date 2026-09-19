import type { Thread } from './domain';

export function failureMessage(error: unknown): string {
  const message = typeof error === 'string' ? error : String((error as { message?: string })?.message || '请求失败，请重试。');
  if (/MINIMAX_API_KEY/.test(message)) return '未配置 MiniMax API Key。请关闭项目副本，在 PowerShell 中运行 .\\start-desktop.ps1，输入密钥后重新发送。';
  if (/invalid_prompt|usage policy|potentially violating/i.test(message)) return '模型服务拒绝了本次请求（invalid_prompt）。请修改消息后重试。';
  return message.slice(0, 800);
}

export function recordTurnFailure(thread: Thread, turnId: string, error: unknown) {
  const id = `error-${turnId}`;
  thread.status = 'failed';
  if (!thread.messages.some(message => message.id === id)) {
    thread.messages.push({ id, role: 'system', content: failureMessage(error), createdAt: new Date().toISOString() });
  }
}

export function retryMessage(error: unknown): string {
  const raw = typeof error === 'string' ? error : (error as { message?: unknown })?.message;
  const reason = typeof raw === 'string' ? raw.replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim() : '';
  return reason ? `正在重试：${reason.slice(0, 500)}${reason.length > 500 ? '…' : ''}` : '服务暂时不可用，正在重试…';
}
