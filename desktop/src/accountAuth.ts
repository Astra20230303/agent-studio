const validId = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);

export type AccountLoginStart =
  | { kind: 'apiKey' }
  | { kind: 'chatgpt'; loginId: string; authUrl: string }
  | { kind: 'chatgptDeviceCode'; loginId: string; verificationUrl: string; userCode: string };

export function readAccountLoginStart(value: any): AccountLoginStart {
  if (value?.type === 'apiKey') return { kind: 'apiKey' };
  if (value?.type === 'chatgpt' && validId(value.loginId) && typeof value.authUrl === 'string' && /^https:\/\//.test(value.authUrl)) {
    return { kind: 'chatgpt', loginId: value.loginId, authUrl: value.authUrl };
  }
  if (value?.type === 'chatgptDeviceCode' && validId(value.loginId) && typeof value.verificationUrl === 'string' && /^https:\/\//.test(value.verificationUrl) && validId(value.userCode)) {
    return { kind: 'chatgptDeviceCode', loginId: value.loginId, verificationUrl: value.verificationUrl, userCode: value.userCode };
  }
  throw new Error('登录响应无效');
}

export function readAccountLoginCompleted(value: any) {
  if (typeof value?.success !== 'boolean' || value.loginId != null && !validId(value.loginId)) return undefined;
  return { success: value.success, loginId: value.loginId as string | undefined, error: typeof value.error === 'string' ? value.error : undefined };
}
