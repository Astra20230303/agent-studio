const fs = require('node:fs/promises');
const path = require('node:path');
async function workspaceFile(root, name = '.', action = 'list', query = '') {
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof name !== 'string') throw Error('无效工作区路径');
  root = await fs.realpath(root);
  const target = await fs.realpath(path.resolve(root, name));
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || relative.split(path.sep).includes('.git')) throw Error('路径不在工作区可浏览范围内');
  if (action === 'search') {
    if (typeof query !== 'string' || !query.trim()) return { entries: [], truncated: false, skipped: 0 };
    const term = query.trim().replace(/\\/g, '/').toLowerCase();
    const entries = []; const pending = [target]; let visited = 0; let skipped = 0; let truncated = false;
    while (pending.length && !truncated) {
      const directory = pending.shift();
      let handle;
      try { handle = await fs.opendir(directory); } catch { skipped++; continue; }
      for await (const entry of handle) {
        if (++visited > 20000 || entries.length >= 200) { truncated = true; break; }
        if (entry.name === '.git' || entry.isSymbolicLink()) continue;
        const full = path.join(directory, entry.name); const file = path.relative(root, full);
        if (entry.isDirectory()) { pending.push(full); continue; }
        if (entry.isFile() && file.replace(/\\/g, '/').toLowerCase().includes(term)) entries.push({ name: entry.name, path: file, directory: false, symlink: false });
      }
    }
    return { entries: entries.sort((a, b) => a.path.localeCompare(b.path)), truncated, skipped };
  }
  if (action === 'list') {
    const entries = await fs.readdir(target, { withFileTypes: true });
    const visible = entries.filter(entry => entry.name !== '.git').sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    const listed = await Promise.all(visible.slice(0, 1000).map(async entry => {
      let directory = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try { directory = (await fs.stat(path.join(target, entry.name))).isDirectory(); } catch { /* Dangling links remain selectable and report a read error. */ }
      }
      return { name: entry.name, path: path.join(relative, entry.name), directory, symlink: entry.isSymbolicLink() };
    }));
    return { entries: listed.sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name)), truncated: visible.length > 1000 };
  }
  if (action !== 'read') throw Error('不支持的文件操作');
  const handle = await fs.open(target, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw Error('请选择文件');
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[path.extname(target).toLowerCase()];
    if (mime) {
      if (stat.size > 10 * 1024 * 1024) throw Error('图片超过 10 MB，无法预览');
      const bytes = Buffer.alloc(stat.size + 1);
      let total = 0;
      while (total < bytes.length) {
        const { bytesRead } = await handle.read(bytes, total, bytes.length - total, total);
        if (!bytesRead) break;
        total += bytesRead;
      }
      if (total > stat.size) throw Error('文件正在变化，请刷新后重试');
      return { image: `data:${mime};base64,${bytes.subarray(0, total).toString('base64')}`, size: total };
    }
    const buffer = Buffer.alloc(Math.min(stat.size, 256 * 1024));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);
    if (bytes.includes(0)) return { binary: true, size: stat.size };
    return { text: new TextDecoder('utf-8').decode(bytes), truncated: stat.size > bytesRead, size: stat.size };
  } finally { await handle.close(); }
}
module.exports = { workspaceFile };
