export type ValidTerminalEvent = { id: string; type: 'data'; data: string } | { id: string; type: 'exit'; code: number };
export function readTerminalEvent(value: unknown): ValidTerminalEvent | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== 'string' || !event.id.trim() || event.id !== event.id.trim() || /[\0\r\n]/.test(event.id)) return;
  if (event.type === 'data' && typeof event.data === 'string') return { id: event.id, type: 'data', data: event.data };
  if (event.type === 'exit' && Number.isSafeInteger(event.code)) return { id: event.id, type: 'exit', code: event.code as number };
}
