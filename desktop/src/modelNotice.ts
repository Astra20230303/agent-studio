import { readModelReroute } from './modelReroute.ts';
import { readModelVerification } from './modelVerification.ts';
import { readModelSafetyBuffering } from './modelSafetyBuffering.ts';
import type { TurnRuntime } from './turnRuntime';

export function modelNotice(method: string | undefined, params: unknown, activeThreadId: string | undefined, read: (threadId: string) => TurnRuntime | undefined): { text: string; clearBuffering?: boolean } | undefined {
  const input = method === 'model/rerouted' ? readModelReroute(params)
    : method === 'model/verification' ? readModelVerification(params)
    : method === 'model/safetyBuffering/updated' ? readModelSafetyBuffering(params) : undefined;
  if (!input || input.threadId !== activeThreadId) return;
  const runtime = read(input.threadId);
  if (!runtime?.turnId || runtime.turnId !== input.turnId || runtime.completed.includes(input.turnId)) return;
  if ('fromModel' in input) return { text: `模型已从 ${input.fromModel} 切换为 ${input.toModel}（${input.reason}）` };
  if ('verifications' in input) return input.verifications.length ? { text: `模型验证：${input.verifications.join('、')}` } : undefined;
  if (!input.showBufferingUi) return { text: '', clearBuffering: true };
  return { text: `模型安全缓冲中：${input.reasons.join('、') || '正在完成安全检查'}${input.fasterModel ? ` · 可切换为 ${input.fasterModel}` : ''}` };
}
