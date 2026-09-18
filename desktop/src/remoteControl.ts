export type RemoteControlStatus = { status: 'disabled' | 'connecting' | 'connected' | 'errored'; serverName: string; installationId: string; environmentId?: string | null };
export type RemoteControlPairing = { pairingCode: string; manualPairingCode?: string | null; environmentId: string; expiresAt: number };
export type RemoteControlClient = { clientId: string; displayName?: string | null; deviceType?: string | null; platform?: string | null; osVersion?: string | null; deviceModel?: string | null; appVersion?: string | null; lastSeenAt?: number | null };
export type RemoteControlClientPage = { data: RemoteControlClient[]; nextCursor?: string };
const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
const optionalText = (value: unknown) => value == null ? value : typeof value === 'string' && !/[\0\r\n]/.test(value) ? value : undefined;
export function readRemoteControlStatus(value: unknown): RemoteControlStatus {
  const input = value as any;
  if (!input || !['disabled', 'connecting', 'connected', 'errored'].includes(input.status) || !identity(input.serverName) || !identity(input.installationId) || input.environmentId != null && !identity(input.environmentId)) throw new Error('远程控制状态格式无效');
  return { status: input.status, serverName: input.serverName, installationId: input.installationId, ...(input.environmentId != null ? { environmentId: input.environmentId } : {}) };
}
export function readRemoteControlPairing(value: unknown): RemoteControlPairing {
  const input = value as any;
  if (!input || !identity(input.pairingCode) || !identity(input.environmentId) || !Number.isSafeInteger(input.expiresAt) || input.expiresAt <= 0 || input.manualPairingCode != null && !identity(input.manualPairingCode)) throw new Error('远程控制配对信息无效');
  return { pairingCode: input.pairingCode, environmentId: input.environmentId, expiresAt: input.expiresAt, ...(input.manualPairingCode != null ? { manualPairingCode: input.manualPairingCode } : {}) };
}
export function readRemoteControlClients(value: unknown): RemoteControlClientPage {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.nextCursor != null && !identity(input.nextCursor)) throw new Error('远程控制设备列表格式无效');
  const ids = new Set<string>();
  const data = input.data.map((item: any) => {
    if (!identity(item?.clientId) || ids.has(item.clientId) || ['displayName', 'deviceType', 'platform', 'osVersion', 'deviceModel', 'appVersion'].some(key => item[key] !== undefined && optionalText(item[key]) === undefined) || item.lastSeenAt != null && !Number.isSafeInteger(item.lastSeenAt)) throw new Error('远程控制设备条目无效');
    ids.add(item.clientId);
    return { clientId: item.clientId, ...Object.fromEntries(['displayName', 'deviceType', 'platform', 'osVersion', 'deviceModel', 'appVersion', 'lastSeenAt'].filter(key => item[key] != null).map(key => [key, item[key]])) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
export function remoteControlId(value: string, label = '远程控制身份') { if (!identity(value)) throw new Error(`${label}无效`); return value; }
