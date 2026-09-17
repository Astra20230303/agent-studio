const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
function git(cwd, args) {
  return new Promise((resolve, reject) => execFile('git', ['--no-optional-locks', '--literal-pathspecs', '-c', 'core.quotepath=false', ...args], { cwd, windowsHide: true, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => error ? reject(Error(stderr.trim() || error.message)) : resolve(stdout)));
}
function parseStatus(output) {
  const records = output.split('\0'); const files = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i]; if (!record) continue;
    const status = record.slice(0, 2), filename = record.slice(3);
    const original = /[RC]/.test(status) ? records[++i] : undefined;
    files.push({ path: filename, original, index: status[0], working: status[1], untracked: status === '??' });
  }
  return files;
}
async function workspaceGit(input) {
  if (typeof input?.root !== 'string' || !path.isAbsolute(input.root)) throw Error('请选择工作区目录');
  const cwd = await fs.realpath(input.root);
  const root = (await git(cwd, ['rev-parse', '--show-toplevel'])).trim();
  if (input.action === 'status') {
    const branch = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => git(root, ['rev-parse', '--short', 'HEAD']))).trim();
    return { root, branch, files: parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])) };
  }
  if (input.action !== 'diff' || typeof input.path !== 'string' || !input.path) throw Error('无效差异请求');
  const entries = parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  const entry = entries.find(entry => entry.path === input.path);
  if (!entry) throw Error('文件状态已变化，请刷新');
  if (entry.untracked) {
    const { workspaceFile } = require('./workspace-files.cjs');
    const result = await workspaceFile(root, entry.path, 'read');
    return { diff: result.binary || result.image ? '未跟踪的二进制文件' : (result.text || '').split('\n').map(line => '+' + line).join('\n'), truncated: result.truncated, untracked: true };
  }
  const paths = [...new Set([entry.path, entry.original].filter(Boolean))];
  return { diff: await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-color', ...(input.staged ? ['--cached'] : []), '--', ...paths]) };
}
module.exports = { workspaceGit, parseStatus };
