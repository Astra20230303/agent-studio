const { execFileSync } = require('node:child_process');

// This describes the checkout at packaging time, not the provenance of prebuilt assets.
function sourceSnapshot(directory) {
  const observedAt = new Date().toISOString();
  const git = args => execFileSync('git', ['-C', directory, ...args], { stdio:['ignore','pipe','pipe'], encoding:'utf8', windowsHide:true, timeout:10000, maxBuffer:4*1024*1024 }).trim();
  try {
    const commit = git(['rev-parse', '--verify', 'HEAD']);
    if (!/^[a-f0-9]{40,64}$/.test(commit)) throw Error('Invalid commit');
    const status = git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none']);
    return { observedAt, commit, state: status ? 'modified' : 'clean', scope:'repository', phase:'packaging' };
  } catch {
    return { observedAt, commit:null, state:'unknown', scope:'repository', phase:'packaging' };
  }
}
module.exports = { sourceSnapshot };
