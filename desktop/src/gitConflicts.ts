export function isConflict(file: { index: string; working: string }) {
  return ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(file.index + file.working);
}
export function conflictPrompt(root: string, branch: string, files: { path: string; index: string; working: string }[]) {
  return `请检查并解决以下 Git 冲突，保留双方需要的修改，验证结果并说明处理方式。\n工作区：${JSON.stringify(root)}\n分支：${JSON.stringify(branch)}\n冲突文件：\n${files.filter(isConflict).map(file => JSON.stringify(file.path)).join('\n')}`;
}
