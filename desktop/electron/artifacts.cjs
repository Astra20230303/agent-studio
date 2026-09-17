const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
async function resolveArtifact(root, name, missing = false) {
  if (typeof name !== 'string' || !name || /[\r\n\0]/.test(name)) throw Error('无效文件路径');
  root = await fs.realpath(root);
  const file = path.resolve(root, name);
  const real = missing ? path.join(await fs.realpath(path.dirname(file)), path.basename(file)) : await fs.realpath(file);
  const rel = path.relative(root, real);
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) || rel.split(path.sep).includes('.git')) throw Error('文件必须位于当前项目内');
  return real;
}
async function readArtifact(root, name) {
  const file = await resolveArtifact(root, name);
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 10 * 1024 * 1024) throw Error('仅支持 10 MB 以内的文件');
  const data = await fs.readFile(file);
  const mime = {'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'}[path.extname(file).toLowerCase()];
  return { name: path.basename(file), data: `data:${mime || 'application/octet-stream'};base64,${data.toString('base64')}`, image: Boolean(mime) };
}
async function undoArtifact(root, change) {
  root = await fs.realpath(root);
  const kind = typeof change.kind === 'string' ? change.kind : change.kind?.type;
  const file = await resolveArtifact(root, change.path, kind === 'delete');
  const diff = change.diff;
  if (typeof diff !== 'string' || !diff || diff.length > 2 * 1024 * 1024) throw Error('缺少可撤销的差异');
  if (kind === 'add' && !diff.includes('@@')) {
    const lines = diff.split('\n'); if (lines.at(-1) === '') lines.pop();
    if (!lines.every(line => line.startsWith('+'))) throw Error('无法验证新文件内容');
    const expected = lines.map(line => line.slice(1)).join('\n');
    const current = await fs.readFile(file, 'utf8');
    if (current !== expected && current !== expected + '\n') throw Error('文件已有后续修改，无法安全撤销');
    await fs.unlink(file); return;
  }
  const start = diff.indexOf('@@');
  if (start < 0) throw Error('差异缺少完整上下文，无法安全撤销');
  const body = diff.slice(start);
  if (/^(diff --git|--- |\+\+\+ )/m.test(body)) throw Error('不支持多文件差异');
  const rel = path.relative(root, file).split(path.sep).join('/');
  const patch = `--- ${kind === 'add' ? '/dev/null' : 'a/' + rel}\n+++ ${kind === 'delete' ? '/dev/null' : 'b/' + rel}\n${body}${body.endsWith('\n') ? '' : '\n'}`;
  const run = check => new Promise((resolve, reject) => {
    const child = spawn('git', ['-c', 'core.autocrlf=false', 'apply', '--reverse', ...(check ? ['--check'] : []), '--whitespace=nowarn', '-'], {cwd: root, windowsHide: true});
    let error = ''; child.stderr.on('data', data => error += data); child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(Error('无法安全撤销：' + error)));
    child.stdin.on('error', () => {}); child.stdin.end(patch);
  });
  await run(true); await run(false);
}
module.exports = { readArtifact, undoArtifact, resolveArtifact };
