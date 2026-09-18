export type AccountInfo = { kind: 'apiKey' | 'chatgpt' | 'amazonBedrock'; email?: string; planType?: string; managedCredentials?: boolean; requiresOpenAiAuth: boolean };
export function readAccountInfo(value: any): AccountInfo {
  if (typeof value?.requiresOpenaiAuth !== 'boolean' && typeof value?.requiresOpenAIAuth !== 'boolean') throw new Error('账户响应无效');
  const requiresOpenAiAuth = value.requiresOpenaiAuth ?? value.requiresOpenAIAuth;
  if (value.account == null) return { kind: 'apiKey', requiresOpenAiAuth };
  const account = value.account;
  if (account.type === 'apiKey') return { kind: 'apiKey', requiresOpenAiAuth };
  if (account.type === 'chatgpt' && (account.email == null || typeof account.email === 'string') && typeof account.planType === 'string') return { kind: 'chatgpt', ...(account.email ? { email: account.email } : {}), planType: account.planType, requiresOpenAiAuth };
  if (account.type === 'amazonBedrock' && typeof account.usesCodexManagedCredentials === 'boolean') return { kind: 'amazonBedrock', managedCredentials: account.usesCodexManagedCredentials, requiresOpenAiAuth };
  throw new Error('账户类型无效');
}
