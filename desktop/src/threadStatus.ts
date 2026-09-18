import type { ThreadStatus } from './domain';

const identity = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\0\r\n]/.test(value);

export function readThreadStatus(value: any): { status: ThreadStatus } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !identity(value.threadId) || !value.status || typeof value.status !== 'object' || Array.isArray(value.status) || typeof value.status.type !== 'string') return;
  if (value.status.type === 'systemError') return { status: 'failed' };
  if (value.status.type === 'idle') return { status: 'idle' };
  if (value.status.type === 'notLoaded') return { status: 'idle' };
  if (value.status.type !== 'active' || !Array.isArray(value.status.activeFlags) || value.status.activeFlags.some((flag: unknown) => flag !== 'waitingOnApproval' && flag !== 'waitingOnUserInput')) return;
  return { status: value.status.activeFlags.length ? 'needs_input' : 'running' };
}
