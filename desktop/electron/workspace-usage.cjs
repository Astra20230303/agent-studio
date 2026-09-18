const fs = require('node:fs');
const path = require('node:path');

function assertWorkspaceIdle(directory, { terminals, scheduler, projectRoot }) {
  const root = fs.realpathSync.native(directory);
  const contains = cwd => {
    let resolved;
    try { resolved = fs.realpathSync.native(cwd); } catch { resolved = path.resolve(cwd); }
    const relative = path.relative(root, resolved);
    return !relative || relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  };
  for (const cwd of terminals.directories.values()) {
    if (contains(cwd)) throw Error('工作树仍有终端会话，请先关闭终端。');
  }
  if (scheduler.active) {
    const task = scheduler.get(scheduler.active.taskId);
    if (task.kind === 'agent' && contains(task.cwd || projectRoot)) throw Error('工作树仍有定时任务运行，请先停止任务。');
  }
}

module.exports = { assertWorkspaceIdle };
