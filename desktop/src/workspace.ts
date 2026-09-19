import type { DesktopState, Thread } from './domain';

// Recent local projects use directory paths (or local IDs), not app-server IDs.
// Also recognize paths left on drafts after their recent-project entry is removed.
export function remoteProjectIdFor(state: Pick<DesktopState, 'projects'>, projectId?: string): string | undefined {
  if (!projectId || state.projects.some(project => project.id === projectId)
    || /^(?:[A-Za-z]:[\\/]|\/|\\\\)/.test(projectId)) return undefined;
  return projectId;
}
export function workspaceFor(state: DesktopState, thread?: Thread): string | undefined {
  if (thread?.cwd) return thread.cwd;
  const projectId = thread?.projectId || (!thread?.remoteId ? state.activeProjectId : undefined);
  return state.projects.find(project => project.id === projectId)?.path;
}
