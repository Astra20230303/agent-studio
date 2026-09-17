const fs = require('node:fs/promises');
const path = require('node:path');
async function workspaceFile(root, name = '.', action = 'list') {
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof name !== 'string') throw Error('无效工作区路径');
  root = await fs.realpath(root);
  const target = await fs.realpath(path.resolve(root, name));
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || relative.split(path.sep).includes('.git')) throw Error('路径不在工作区可浏览范围内');
  if (action === 'list') {
    const entries = await fs.readdir(target, { withFileTypes: true });
    const visible = entries.filter(entry => entry.name !== '.git').sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    return { entries: visible.slice(0, 1000).map(entry => ({ name: entry.name, path: path.join(relative, entry.name), directory: entry.isDirectory(), symlink: entry.isSymbolicLink() })), truncated: visible.length > 1000 };
  }
  if (action !== 'read') throw Error('不支持的文件操作');
  const handle = await fs.open(target, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw Error('请选择文件');
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[path.extname(target).toLowerCase()];
    if (mime) {
      if (stat.size > 10 * 1024 * 1024) throw Error('图片超过 10 MB，无法预览');
      return { image: `data:${mime};base64,${(await handle.readFile()).toString('base64')}`, size: stat.size };
    }
    const buffer = Buffer.alloc(Math.min(stat.size, 256 * 1024));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);
    if (bytes.includes(0)) return { binary: true, size: stat.size };
    return { text: new TextDecoder('utf-8').decode(bytes), truncated: stat.size > bytesRead, size: stat.size };
  } finally { await handle.close(); }
}
module.exports = { workspaceFile };
