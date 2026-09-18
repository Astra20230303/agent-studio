const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
function git(cwd, args, network = false) {
  // Stash accepts no user pathspec here. Literal mode interferes with its
  // internal untracked cleanup on Git for Windows; file operations still need it.
  const pathOptions = args[0] === 'stash' ? [] : ['--literal-pathspecs'];
  return new Promise((resolve, reject) => execFile('git', ['--no-optional-locks', ...pathOptions, '-c', 'core.quotepath=false', ...args], { cwd, windowsHide: true, encoding: 'utf8', timeout: network ? 60000 : 15000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => error ? reject(Error([stderr, stdout].map(value => value.trim()).filter(Boolean).join('\n') || error.message)) : resolve(stdout)));
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
async function workspaceGit(input, { assertWorktreeIdle } = {}) {
  if (typeof input?.root !== 'string' || !path.isAbsolute(input.root)) throw Error('请选择工作区目录');
  const cwd = await fs.realpath(input.root);
  const root = (await git(cwd, ['rev-parse', '--show-toplevel'])).trim();
  if (input.action === 'merge-branch') {
    const current = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();
    const head = (await git(root, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim();
    if (!current || input.expectedBranch !== current || input.expectedHead !== head) throw Error('当前分支或提交已变化，请刷新 Git 变更');
    const branches = (await git(root, ['for-each-ref', '--format=%(refname:strip=2)', 'refs/heads/'])).trim().split('\n').filter(Boolean);
    if (typeof input.branch !== 'string' || !branches.includes(input.branch)) throw Error('目标本地分支不存在，请刷新');
    if (input.branch === current) throw Error('不能将当前分支合并到自身');
    await git(root, ['merge', '--no-edit', '--', input.branch]);
    return { branch: current, commit: (await git(root, ['rev-parse', 'HEAD'])).trim() };
  }
  if (input.action === 'stash' || input.action === 'stash-pop') {
    const branch = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();
    const head = (await git(root, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim();
    if (!branch || input.expectedBranch !== branch || input.expectedHead !== head) throw Error('当前分支或提交已变化，请刷新 Git 变更');
    if (input.action === 'stash') {
      if (!(await git(root, ['status', '--porcelain'])).trim()) throw Error('工作区没有可暂存的修改');
      await git(root, ['stash', 'push', '--include-untracked', '-m', typeof input.message === 'string' && input.message.trim() ? input.message.trim() : 'Felix 工作区暂存']);
      return { changed: true };
    }
    if (!(await git(root, ['stash', 'list', '--format=%gd']).catch(() => '')).trim()) throw Error('没有可恢复的工作区暂存');
    await git(root, ['stash', 'pop']);
    return { changed: true };
  }
  if (['branches', 'switch-branch', 'track-branch', 'delete-branch'].includes(input.action)) {
    const branches = (await git(root, ['for-each-ref', '--format=%(refname:strip=2)', 'refs/heads/'])).trim().split('\n').filter(Boolean);
    const current = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();
    const head = (await git(root, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim();
    const remoteBranches = (await git(root, ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(symref)', 'refs/remotes/'])).trim().split('\n').filter(Boolean).map(row => {
      const [ref, head, symbolic] = row.split('\0'); return { ref, head, symbolic };
    }).filter(entry => !entry.symbolic).map(({ ref, head }) => ({ ref, head }));
    if (input.action === 'branches') return { branches, remoteBranches, current, head };
    if (input.action === 'track-branch') {
      const remote = remoteBranches.find(entry => entry.ref === input.ref);
      if (!remote) throw Error('远端分支不存在，请获取远端后刷新分支列表');
      if (input.expectedBranch !== current || input.expectedHead !== head || input.expectedRemoteHead !== remote.head) throw Error('当前分支或远端提交已变化，请刷新分支列表');
      if (typeof input.branch !== 'string' || !input.branch || input.branch !== input.branch.trim()) throw Error('请输入有效本地分支名');
      await git(root, ['check-ref-format', '--branch', input.branch]);
      await git(root, ['check-ref-format', `refs/heads/${input.branch}`]);
      if (branches.includes(input.branch)) throw Error('本地分支已存在，请选择其他名称或切换已有分支');
      await git(root, ['switch', '--no-guess', '--track=direct', '-c', input.branch, '--', remote.ref]);
      return { branch: input.branch, ...await tracking(root) };
    }
    if (input.action === 'delete-branch') {
      if (input.expectedBranch !== current || input.expectedHead !== head) throw Error('当前分支或提交已变化，请刷新分支列表');
      if (typeof input.branch !== 'string' || !branches.includes(input.branch)) throw Error('本地分支不存在，请刷新分支列表');
      if (input.branch === current) throw Error('不能删除当前分支，请先切换到其他分支');
      await git(root, ['branch', '-d', '--', input.branch]);
      return { branch: input.branch };
    }
    if (typeof input.branch !== 'string' || !branches.includes(input.branch)) throw Error('本地分支不存在，请刷新分支列表');
    if (input.expectedBranch !== current || input.expectedHead !== head) throw Error('当前分支或提交已变化，请刷新分支列表');
    await git(root, ['switch', '--no-guess', '--', input.branch]);
    return { branch: input.branch };
  }
  if (['worktrees', 'open-worktree', 'remove-worktree'].includes(input.action)) {
    const output = await git(root, ['worktree', 'list', '--porcelain', '-z']);
    const worktrees = output.split('\0\0').filter(Boolean).map((record, index) => {
      const entry = {};
      for (const field of record.split('\0').filter(Boolean)) {
        const split = field.indexOf(' ');
        entry[split < 0 ? field : field.slice(0, split)] = split < 0 ? true : field.slice(split + 1);
      }
      return { primary: index === 0, current: path.resolve(entry.worktree).toLowerCase() === path.resolve(root).toLowerCase(), path: entry.worktree, branch: entry.branch?.replace(/^refs\/heads\//, ''), head: entry.HEAD, detached: !!entry.detached, bare: !!entry.bare, locked: entry.locked, prunable: entry.prunable };
    });
    if (input.action === 'worktrees') return { worktrees };
    const entry = worktrees.find(item => item.path === input.path);
    if (!entry || entry.bare || entry.prunable) throw Error('工作树已失效，请刷新列表');
    const destination = await fs.realpath(entry.path);
    const common = async directory => fs.realpath((await git(directory, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).trim());
    if (await common(root) !== await common(destination)) throw Error('工作树已不属于当前仓库');
    const gitDirectory = await fs.realpath((await git(destination, ['rev-parse', '--absolute-git-dir'])).trim());
    const environment = gitDirectory === await common(destination) ? 'local' : 'worktree';
    if (input.action === 'remove-worktree') {
      if (destination === await fs.realpath(root) || environment !== 'worktree') throw Error('不能删除当前或主工作树');
      if (entry.locked !== undefined) throw Error('工作树已锁定，请先在 Git 中解锁');
      if (input.expectedHead !== entry.head) throw Error('工作树提交已变化，请刷新后重试');
      if ((await git(destination, ['status', '--porcelain', '--untracked-files=all', '--ignored'])).trim()) throw Error('工作树包含未提交、未跟踪或忽略文件，请先处理后重试');
      assertWorktreeIdle?.(destination);
      await git(root, ['worktree', 'remove', '--', destination]);
      return { removed: entry.path };
    }
    return { id: destination, path: destination, name: `${path.basename(destination)} · ${entry.branch || '游离 HEAD'}`, environment, git: { isRepository: true, branch: entry.branch || entry.head?.slice(0, 8) } };
  }
  if (input.action === 'history') {
    const refs = (await git(root, ['for-each-ref', '--format=%(refname)', 'refs/heads/', 'refs/remotes/'])).trim().split('\n').filter(Boolean);
    const ref = input.ref ?? 'HEAD';
    if (typeof ref !== 'string' || (ref !== 'HEAD' && !refs.includes(ref))) throw Error('分支不存在，请刷新历史');
    const offset = input.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw Error('无效历史页码');
    if (input.anchor !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.anchor)) throw Error('无效提交标识');
    const anchor = input.anchor || (await git(root, ['rev-parse', '--verify', `${ref}^{commit}`]).catch(error => { if (ref === 'HEAD') return ''; throw error; })).trim();
    if (!anchor) return { refs, commits: [], hasMore: false };
    const output = await git(root, ['log', '--no-show-signature', '--format=%H%x00%an%x00%aI%x00%s', '-z', '--max-count=31', `--skip=${offset}`, anchor, '--']);
    const fields = output.split('\0');
    const commits = [];
    for (let i = 0; i + 3 < fields.length; i += 4) commits.push({ id: fields[i], author: fields[i + 1], date: fields[i + 2], subject: fields[i + 3] });
    return { refs, anchor, commits: commits.slice(0, 30), hasMore: commits.length > 30 };
  }
  if (input.action === 'commit-detail') {
    if (typeof input.commit !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.commit)) throw Error('无效提交标识');
    const detail = await git(root, ['show', '--no-show-signature', '--no-ext-diff', '--no-textconv', '--no-color', '--format=fuller', '--stat', '--patch', '--diff-merges=first-parent', input.commit, '--']);
    return { detail };
  }
  if (input.action === 'pull' || input.action === 'pull-merge') {
    const merging = input.action === 'pull-merge';
    const currentBranch = () => git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).then(value => value.trim(), () => '');
    const branch = await currentBranch();
    if (!branch || branch !== input.expectedBranch) throw Error('当前分支已变化或处于游离状态，请刷新');
    const target = await tracking(root);
    if (!target.remote || target.remote === '.' || !target.remoteRef?.startsWith('refs/heads/')) throw Error('当前分支尚未配置远端上游分支');
    const before = (await git(root, ['rev-parse', 'HEAD'])).trim();
    if (merging && before !== input.expectedHead) throw Error('当前提交已变化，请刷新');
    const checkMerge = async () => {
      if (!merging) return;
      if ((await git(root, ['status', '--porcelain'])).trim()) throw Error('请先提交或暂存工作区修改后再合并上游');
      if ((await git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).catch(() => '')).trim()) throw Error('请先完成当前合并');
    };
    await checkMerge();
    await git(root, ['fetch', '--no-tags', '--', target.remote, target.remoteRef], true);
    const fetched = (await git(root, ['rev-parse', '--verify', 'FETCH_HEAD^{commit}'])).trim();
    if (await currentBranch() !== branch || (await git(root, ['rev-parse', 'HEAD'])).trim() !== before) throw Error('获取期间当前分支或提交已变化，请刷新后重试');
    await checkMerge();
    await git(root, ['-c', 'merge.autostash=false', 'merge', merging ? '--ff' : '--ff-only', '--no-edit', fetched]);
    const commit = (await git(root, ['rev-parse', 'HEAD'])).trim();
    return { upstream: target.upstream, commit, changed: commit !== before };
  }
  if (input.action === 'publish') {
    const branch = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();
    if (!branch || branch !== input.expectedBranch) throw Error('当前分支已变化或处于游离状态，请刷新');
    if ((await tracking(root)).upstream) throw Error('当前分支已有上游，请刷新后推送到上游');
    const remotes = (await git(root, ['remote'])).trim().split('\n');
    if (typeof input.remote !== 'string' || !input.remote || !remotes.includes(input.remote)) throw Error('请选择已配置的远端');
    await git(root, ['rev-parse', '--verify', 'HEAD']);
    await git(root, ['push', '--porcelain', '--set-upstream', '--', input.remote, `refs/heads/${branch}:refs/heads/${branch}`], true);
    return { upstream: (await tracking(root)).upstream };
  }
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
    const symbolic = (await git(root, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '')).trim();
    const branch = symbolic || (await git(root, ['rev-parse', '--short', 'HEAD'])).trim();
    const head = (await git(root, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim();
    const branches = (await git(root, ['for-each-ref', '--format=%(refname:strip=2)', 'refs/heads/'])).trim().split('\n').filter(Boolean);
    const remotes = (await git(root, ['remote'])).trim().split('\n').filter(Boolean);
    const stashAvailable = Boolean((await git(root, ['stash', 'list', '--format=%gd']).catch(() => '')).trim());
    const merging = await git(root, ['rev-parse', '--verify', 'MERGE_HEAD']).then(() => true, () => false);
    return { root, branch, branches, head, merging, detached: !symbolic, remotes, stashAvailable, ...await tracking(root), files: parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])) };
  }
  if (input.action === 'commit') {
    if ((await git(root, ['diff', '--name-only', '--diff-filter=U', '-z'])).length) throw Error('请先解决并暂存所有冲突文件');
    if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 10000 || input.message.includes('\0')) throw Error('请填写有效提交说明');
    const staged = await git(root, ['diff', '--cached', '--name-only', '-z']);
    const merging = await git(root, ['rev-parse', '--verify', 'MERGE_HEAD']).then(() => true, () => false);
    if (!staged && !merging) throw Error('没有已暂存的变更');
    await git(root, ['commit', '-m', input.message]);
    return { commit: (await git(root, ['rev-parse', 'HEAD'])).trim() };
  }
  if (!['conflict', 'diff', 'stage', 'unstage'].includes(input.action) || typeof input.path !== 'string' || !input.path) throw Error('无效差异请求');
  const entries = parseStatus(await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  const entry = entries.find(entry => entry.path === input.path);
  if (!entry) throw Error('文件状态已变化，请刷新');
  if (input.action === 'conflict') {
    const records = (await git(root, ['ls-files', '--unmerged', '-z', '--', entry.path])).split('\0').filter(Boolean);
    if (!records.length) throw Error('冲突状态已变化，请刷新');
    const stages = await Promise.all(records.map(async record => {
      const match = /^(\d+) ([a-f0-9]+) ([123])\t/.exec(record);
      if (!match) throw Error('无法读取冲突索引');
      const [, mode, oid, stage] = match;
      if (mode === '160000') return { stage: Number(stage), text: `子模块提交：${oid}` };
      const size = Number((await git(root, ['cat-file', '-s', oid])).trim());
      if (size > 512 * 1024) return { stage: Number(stage), unavailable: '内容超过 512 KB，无法预览' };
      const text = await git(root, ['cat-file', 'blob', oid]);
      return text.includes('\0') ? { stage: Number(stage), unavailable: '二进制内容无法预览' } : { stage: Number(stage), text };
    }));
    return { stages };
  }
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
