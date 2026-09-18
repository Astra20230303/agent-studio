import type { DesktopState, Message, Thread } from './domain';
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const defaultState = (): DesktopState => ({
  mode: 'code',
  reasoningEffort: 'low',
  theme: 'light',
  model: '',
  permission: 'on-request',
  threads: [],
  projects: [],
  automations: []
  ,providers: []
});

export function decodeState(raw: string | null): DesktopState {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('会话数据格式无效');
    const state: DesktopState = { ...defaultState(), ...parsed };
    if (!Array.isArray(state.threads) || !state.threads.every(thread => thread && typeof thread.id === 'string' && typeof thread.title === 'string' && Array.isArray(thread.messages) && thread.messages.every(message => message && typeof message.content === 'string'))
      || !Array.isArray(state.projects) || !Array.isArray(state.automations)) throw Error('会话数据格式无效');
    state.reasoningEffort = ['low', 'medium', 'high'].includes(state.reasoningEffort) ? state.reasoningEffort : 'low';
    state.mode = state.mode === 'work' ? 'work' : 'code';
    state.theme = ['light', 'dark', 'system'].includes(state.theme) ? state.theme : 'light';
    state.sendShortcut = state.sendShortcut === 'mod-enter' ? 'mod-enter' : 'enter';
    state.permission = ['on-request', 'workspace-write', 'danger-full-access'].includes(state.permission) ? state.permission : 'on-request';
    state.providers = Array.isArray(state.providers) ? state.providers : [];
    state.threads.forEach(ensureThreadTitle);
    return state;
  }
  catch { throw Error('会话和设置读取失败，原始数据已保留。请修复数据后重试读取。'); }
}

export function automaticThreadTitle(thread?: Thread, incoming?: string): string | undefined {
  if (thread?.titleSource || (thread?.title && !['新对话', 'Codex 对话', 'New chat'].includes(thread.title))) return;
  const firstMessage = thread?.messages.find(message => message.role === 'user')?.content || incoming;
  const text = firstMessage?.replace(/\s+/g, ' ').trim();
  if (!text) return;
  const segments = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), part => part.segment);
  return segments.length > 120 ? `${segments.slice(0, 120).join('')}...` : text;
}

export function ensureThreadTitle(thread: Thread) {
  const title = automaticThreadTitle(thread);
  if (title) { thread.title = title; thread.titleSource = 'auto'; }
}

export function createThread(state: DesktopState, title = '新对话'): Thread {
  const thread: Thread = { id: id('thread'), model: state.model || undefined, reasoningEffort: state.reasoningEffort, title, status: 'idle', pinned: false, archived: false, messages: [], updatedAt: now() };
  state.threads = [...state.threads, thread]; state.activeThreadId = thread.id; return thread;
}

export function appendMessage(state: DesktopState, threadId: string, role: Message['role'], content: string) {
  const thread = state.threads.find(item => item.id === threadId); if (!thread) return;
  thread.messages.push({ id: id('message'), role, content, createdAt: now() });
  if (role === 'user') ensureThreadTitle(thread);
  thread.updatedAt = now();
}
