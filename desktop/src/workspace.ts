import type { DesktopState, Thread } from './domain';
export function workspaceFor(state: DesktopState, thread?: Thread): string | undefined {
  if (thread?.cwd) return thread.cwd;
  const projectId = thread?.projectId || (!thread?.remoteId ? state.activeProjectId : undefined);
  return state.projects.find(project => project.id === projectId)?.path;
}
