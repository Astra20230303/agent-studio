export type TurnRuntime = { turnId?: string; activity?: string; completed: string[]; outcomes?: Record<string, string>; revision: number };
export type TurnEvent =
  | { type: 'start'; turnId: string }
  | { type: 'finish'; turnId: string; status?: string }
  | { type: 'activity'; turnId?: string; activity?: string }
  | { type: 'restore'; turnId?: string; revision: number };

export function reduceTurn(current: TurnRuntime | undefined, event: TurnEvent): TurnRuntime {
  const state = current || { completed: [], revision: 0 };
  if (event.type === 'restore') {
    // A history response must not undo notifications received while it was loading.
    if (state.revision !== event.revision) return state;
    return { ...state, turnId: event.turnId, activity: event.turnId ? '正在运行…' : undefined, revision: state.revision + 1 };
  }
  if (event.type === 'start') {
    if (state.completed.includes(event.turnId) || state.turnId === event.turnId) return state;
    return { ...state, turnId: event.turnId, activity: '正在思考…', revision: state.revision + 1 };
  }
  if (event.type === 'finish') {
    const completed = [...state.completed.filter(id => id !== event.turnId), event.turnId].slice(-64);
    const outcomes = Object.fromEntries(completed.map(id => [id, id === event.turnId ? event.status || 'unknown' : state.outcomes?.[id] || 'unknown']));
    return { ...state, completed, outcomes, ...(state.turnId === event.turnId ? { turnId: undefined, activity: undefined } : {}), revision: state.revision + 1 };
  }
  if (!state.turnId || event.turnId && state.turnId !== event.turnId) return state;
  return { ...state, activity: event.activity, revision: state.revision + 1 };
}
