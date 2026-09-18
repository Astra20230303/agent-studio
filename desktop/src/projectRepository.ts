import type { Project } from './domain';

export interface ProjectRepository {
  pick(): Promise<Project | null>;
  defaultRoot(): Promise<string | undefined>;
}
interface ProjectBridge {
  pickProject?: () => Promise<unknown>;
  getProjectRoot?: () => Promise<unknown>;
}
function absolutePath(value: unknown): value is string {
  return typeof value === 'string' && !value.includes('\0') && /^(?:[A-Za-z]:[\\/]|\/|\\\\[^\\]+\\[^\\]+)/.test(value);
}
export function createProjectRepository(bridge: () => ProjectBridge | undefined): ProjectRepository {
  return {
    async pick() {
      const source = bridge();
      if (!source?.pickProject) throw Error('项目选择需要桌面应用。');
      const result = await source.pickProject() as any;
      if (result === null) return null;
      if (!result || typeof result.id !== 'string' || !result.id.trim() || typeof result.name !== 'string' || !result.name.trim()
        || !absolutePath(result.path) || !['local','worktree'].includes(result.environment)
        || typeof result.git?.isRepository !== 'boolean' || result.git.branch != null && typeof result.git.branch !== 'string'
        || result.git.dirty != null && typeof result.git.dirty !== 'boolean') throw Error('项目数据无效，请重新选择目录。');
      return structuredClone(result);
    },
    async defaultRoot() {
      const source = bridge();
      if (!source?.getProjectRoot) return undefined;
      const root = await source.getProjectRoot();
      if (!absolutePath(root)) throw Error('默认工作目录无效，请选择项目后重试。');
      return root;
    },
  };
}
export const projectRepository = createProjectRepository(() => window.desktop);
