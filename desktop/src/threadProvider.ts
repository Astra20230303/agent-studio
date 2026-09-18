import { readThreadStart } from './threadStart.ts';

export function readThreadProvider(value: unknown, threadId: string, providerId: string, model: string) {
  try {
    const snapshot = readThreadStart(value);
    const confirmedModel = (value as { model?: unknown }).model;
    if (snapshot.id !== threadId || snapshot.providerId !== providerId || typeof confirmedModel !== 'string' || !confirmedModel.trim() || confirmedModel !== model) throw Error('Unexpected provider confirmation');
    return { providerId, model: confirmedModel, permissions: snapshot.permissions };
  } catch {
    throw Error('服务端渠道切换确认无效，本地设置未更改，请重新打开会话核对后重试。');
  }
}
