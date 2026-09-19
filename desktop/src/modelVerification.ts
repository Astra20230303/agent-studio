const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export type ModelVerification = { threadId: string; turnId: string; verifications: string[] };
export function readModelVerification(value: unknown): ModelVerification | undefined {
  const input = value as any;
  if (!id(input?.threadId) || !id(input?.turnId) || !Array.isArray(input.verifications) || input.verifications.length > 32 || input.verifications.some((item: unknown) => !id(item))) return;
  const verifications: string[] = input.verifications.filter((item: unknown): item is string => id(item));
  return { threadId: input.threadId, turnId: input.turnId, verifications: Array.from(new Set<string>(verifications)) };
}
