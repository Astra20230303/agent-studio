const labels: Record<string, string> = {
  stage: 'Git 暂存文件', unstage: 'Git 取消文件暂存',
  'stage-all': 'Git 暂存全部变更', 'unstage-all': 'Git 取消全部暂存',
  commit: 'Git 提交', fetch: 'Git 获取远端', pull: 'Git 快进拉取', 'pull-merge': 'Git 合并拉取',
  push: 'Git 推送', publish: 'Git 发布分支', stash: 'Git 暂存工作区', 'stash-pop': 'Git 恢复工作区暂存',
  'merge-branch': 'Git 合并分支', 'create-branch': 'Git 创建本地分支', 'delete-branch': 'Git 删除本地分支',
  'track-branch': 'Git 创建跟踪分支', 'switch-branch': 'Git 切换分支',
  'create-worktree': 'Git 创建工作树', 'remove-worktree': 'Git 删除工作树',
};

// Deliberately accept only an action, never paths, refs, remotes or payloads.
export function recordGitAction(action: string, record?: (action: string) => void) {
  if (Object.hasOwn(labels, action)) record?.(labels[action]);
}
