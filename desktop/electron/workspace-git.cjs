const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
function git(cwd, args, network = false) {
  return new Promise((resolve, reject) => execFile('git', ['--no-optional-locks', '--literal-pathspecs', '-c', 'core.quotepath=false', ...args], { cwd, windowsHide: true, encoding: 'utf8', timeout: network ? 60000 : 15000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => error ? reject(Error(stderr.trim() || error.message)) : resolve(stdout)));
}
async function tracking(root) {
  const ref = (await git(root, ['symbolic-ref', '-q', 'HEAD']).catch(() => '')).trim();
  if (!ref) return {};
  const row = (await git(root, ['for-each-ref', '--format=%(upstream)%00%(upstream:short)%00%(upstream:remotename)%00%(upstream:remoteref)', ref])).trim();
  const [upstreamRef, upstream, remote, remoteRef] = row.split('\0');
  if (!upstreamRef) return {};
  const counts = await git(root, ['rev-list', '--left-right', '--count', `HEAD...${upstreamRef}`]).catch(() => '');
  const [ahead, behind] = counts.trim().split(/\s+/).map(Number);
  return { upstream, remote, remoteRef, ...(counts ? { ahead, behind } : {}) };
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
  if (input.action === 'fetch') {
    if (!(await git(root, ['remote'])).trim()) throw Error('尚未配置远端仓库');
    await git(root, ['fetch', '--all'], true);
    return {};
  }
  if (input.action === 'push') {
    const target = await tracking(root);
    if (!target.remote || target.remote === '.' || !target.remoteRef?.startsWith('refs/heads/')) throw Error('当前分支尚未配置远端上游分支');
    await git(root, ['push', '--porcelain', '--', target.remote, `HEAD:${target.remoteRef}`], true);
    return { upstream: target.upstream };
  }
  if (input.action === 'create-worktree') {
    if (typeof input.branch !== 'string' || !input.branch.trim() || input.branch !== input.branch.trim()) throw Error('请输入有效分支名');
    await git(root, ['check-ref-format', '--branch', input.branch]);
    await git(root, ['check-ref-format', `refs/heads/${input.branch}`]);
    await git(root, ['rev-parse', '--verify', 'HEAD']);
    const parent = path.join(path.dirname(root), '.felix-worktrees');
    await fs.mkdir(parent, { recursive: true });
    const destination = path.join(parent, `${path.basename(root)}-${require('node:crypto').randomUUID()}`);
    await git(root, ['worktree', 'add', '-b', input.branch, destination, 'HEAD']);
    return { id: destination, path: destination, name: `${path.basename(root)} · ${input.branch}`, environment: 'worktree', git: { isRepository: true, branch: input.branch } };
  }
  if (input.action === 'status') {
    const branch = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => git(root, ['rev-parse', '--short', 'HEAD']))).trim();
    return { root, branch, ...await tracking(root), files: parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])) };
  }
  if (input.action === 'commit') {
    if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 10000 || input.message.includes('\0')) throw Error('请填写有效提交说明');
    const staged = await git(root, ['diff', '--cached', '--name-only', '-z']);
    if (!staged) throw Error('没有已暂存的变更');
    await git(root, ['commit', '-m', input.message]);
    return { commit: (await git(root, ['rev-parse', 'HEAD'])).trim() };
  }
  if (!['diff', 'stage', 'unstage'].includes(input.action) || typeof input.path !== 'string' || !input.path) throw Error('无效差异请求');
  const entries = parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  const entry = entries.find(entry => entry.path === input.path);
  if (!entry) throw Error('文件状态已变化，请刷新');
  const paths = [...new Set([entry.path, entry.original].filter(Boolean))];
  if (input.action === 'stage') {
    await git(root, ['add', '--', ...paths]); return {};
  }
  if (input.action === 'unstage') {
    if (entry.untracked) throw Error('文件尚未暂存');
    const hasHead = await git(root, ['rev-parse', '--verify', 'HEAD']).then(() => true, () => false);
    // Before HEAD exists, remove index entries only, preserving working files.
    await git(root, hasHead ? ['reset', 'HEAD', '--', ...paths] : ['rm', '--cached', '-f', '--', ...paths]);
    return {};
  }
  if (entry.untracked) {
    const { workspaceFile } = require('./workspace-files.cjs');
    const result = await workspaceFile(root, entry.path, 'read');
    return { diff: result.binary || result.image ? '未跟踪的二进制文件' : (result.text || '').split('\n').map(line => '+' + line).join('\n'), truncated: result.truncated, untracked: true };
  }
  return { diff: await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-color', ...(input.staged ? ['--cached'] : []), '--', ...paths]) };
}
module.exports = { workspaceGit, parseStatus };
