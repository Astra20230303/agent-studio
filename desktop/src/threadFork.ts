import { readThreadStart } from './threadStart.ts';
export function readThreadFork(value: unknown, sourceId: string) {
  try {
    const snapshot = readThreadStart(value);
    if (snapshot.id === sourceId) throw Error('Fork returned source identity');
    return snapshot;
  } catch {
    throw Error('服务端分叉数据无效，原会话已保留，请重试。');
  }
}
