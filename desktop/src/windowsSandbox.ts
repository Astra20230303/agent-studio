type State = { status: string; busy: boolean; notice: string; error: string; mode?: 'elevated' | 'unelevated' };
let state: State = { status: 'unknown', busy: false, notice: '', error: '' };
const listeners = new Set<() => void>();
const publish = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
export const sandboxSnapshot = () => state;
export const subscribeSandbox = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
let generation = 0;
let cancelSetup: (() => void) | undefined;
export function invalidateWindowsSandbox() {
  const wasSettingUp = Boolean(cancelSetup);
  cancelSetup?.();
  ++generation;
  publish({ status: 'unknown', busy: false, notice: '', error: wasSettingUp ? state.error : '' });
}
export async function checkWindowsSandbox() {
  if (state.busy) return;
  const token = ++generation;
  publish({ busy: true, error: '' });
  try {
    const result = await window.codex?.request('windowsSandbox/readiness', {});
    if (token !== generation) return;
    if (!result?.ok) throw Error(result?.error?.message || result?.error || '无法查询沙箱状态');
    if (!['ready', 'notConfigured', 'updateRequired'].includes(result.result?.status)) throw Error('无法识别沙箱状态');
    publish({ status: result.result.status });
  } catch (error) { if (token === generation) publish({ status: 'unknown', error: String(error instanceof Error ? error.message : error) }); }
  finally { if (token === generation) publish({ busy: false }); }
}
export async function setupWindowsSandbox(mode: 'elevated' | 'unelevated', cwd?: string) {
  if (state.busy) return;
  const bridge = window.codex;
  if (!bridge?.onNotification || !bridge?.onClosed) { publish({ error: '沙箱设置需要 app-server 连接' }); return; }
  const token = ++generation;
  publish({ busy: true, mode, error: '', notice: '正在启动沙箱设置…' });
  let settled = false;
  let offNotification = () => {};
  let offClosed = () => {};
  const finish = (error?: string) => {
    if (settled || token !== generation) return;
    settled = true; offNotification(); offClosed();
    cancelSetup = undefined;
    publish({ busy: false, status: 'unknown', error: error || '', notice: error ? '' : '沙箱设置已保存，请重新连接服务以启用隔离；已有会话权限请单独核对。' });
    if (!error) void checkWindowsSandbox();
  };
  cancelSetup = () => finish('连接已断开，沙箱设置结果未知。重新连接后请刷新状态。');
  offNotification = bridge.onNotification((event: any) => {
    if (event.method === 'windowsSandbox/setupCompleted' && event.params?.mode === mode) finish(event.params.success === true ? undefined : event.params.error || '沙箱设置失败');
  });
  offClosed = bridge.onClosed(() => finish('连接已断开，沙箱设置结果未知。重新连接后请刷新状态。'));
  try {
    const result = await bridge.request('windowsSandbox/setupStart', { mode, ...(cwd ? { cwd } : {}) });
    if (settled) return;
    if (!result?.ok || result.result?.started !== true) throw Error(result?.error?.message || result?.error || '沙箱设置未启动');
    publish({ notice: '沙箱设置进行中，等待服务端完成通知…' });
  } catch (error) { finish(error instanceof Error ? error.message : String(error)); }
}
