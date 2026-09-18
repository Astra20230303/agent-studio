import type { DesktopState } from './domain';
import { workspaceFor } from './workspace.ts';

export function removeRecentProject(state: DesktopState, id: string): boolean {
  if (!state.projects.some(project => project.id === id)) return false;
  for (const thread of state.threads) {
    if (thread.projectId === id || !thread.projectId && !thread.remoteId && state.activeProjectId === id) {
      thread.cwd ??= workspaceFor(state, thread);
      if (thread.projectId === id) delete thread.projectId;
    }
  }
  state.projects = state.projects.filter(project => project.id !== id);
  if (state.activeProjectId === id) delete state.activeProjectId;
  return true;
}
