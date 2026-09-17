const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const revision = bytes => createHash('sha256').update(bytes).digest('hex');
async function workspaceFile(root, name = '.', action = 'list', query = '', edit) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof name !== 'string') throw Error('无效工作区路径');
  root = await fs.realpath(root);
  const target = await fs.realpath(path.resolve(root, name));
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || relative.split(path.sep).includes('.git')) throw Error('路径不在工作区可浏览范围内');
  if (action === 'write') {
    if (typeof edit?.text !== 'string' || typeof edit?.revision !== 'string' || Buffer.byteLength(edit.text) > 256 * 1024) throw Error('无效编辑内容或文件超过 256 KB');
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 256 * 1024) throw Error('此文件不支持编辑');
    const bytes = await fs.readFile(target);
    if (bytes.includes(0)) throw Error('二进制文件不支持编辑');
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (revision(bytes) !== edit.revision) throw Error('文件已被外部修改，请保留编辑内容并重新读取文件');
    const temporary = path.join(path.dirname(target), `.felix-edit-${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, edit.text, { encoding: 'utf8', flag: 'wx', mode: stat.mode });
      if (await fs.realpath(path.resolve(root, name)) !== target || revision(await fs.readFile(target)) !== edit.revision) throw Error('文件已被外部修改，请重新读取');
      await fs.rename(temporary, target);
    } finally { await fs.rm(temporary, { force: true }); }
    return { text: edit.text, revision: revision(Buffer.from(edit.text)), size: Buffer.byteLength(edit.text), truncated: false };
  }
  if (action === 'search' || action === 'search-content') {
    const contentSearch = action === 'search-content';
    if (typeof query !== 'string' || !query.trim()) return { entries: [], truncated: false, skipped: 0 };
    const term = (contentSearch ? query.trim() : query.trim().replace(/\\/g, '/')).toLowerCase();
    if (term.length > 1000 || term.includes('\n') || term.includes('\r')) throw Error('请输入不超过 1000 字符的单行关键词');
    let scannedBytes = 0;
    const entries = []; const pending = [target]; let visited = 0; let skipped = 0; let truncated = false;
    while (pending.length && !truncated) {
      const directory = pending.shift();
      let handle;
      try {
        const resolved = await fs.realpath(directory);
        const within = path.relative(root, resolved);
        if (resolved !== directory || within === '..' || within.startsWith('..' + path.sep) || path.isAbsolute(within) || within.split(path.sep).includes('.git')) { skipped++; continue; }
        handle = await fs.opendir(resolved);
      } catch { skipped++; continue; }
      for await (const entry of handle) {
        if (++visited > 20000 || entries.length >= 200) { truncated = true; break; }
        if (entry.name === '.git' || entry.isSymbolicLink()) continue;
        const full = path.join(directory, entry.name); const file = path.relative(root, full);
        if (entry.isDirectory()) { pending.push(full); continue; }
        if (!entry.isFile()) continue;
        if (!contentSearch) {
          if (file.replace(/\\/g, '/').toLowerCase().includes(term)) entries.push({ name: entry.name, path: file, directory: false, symlink: false });
          continue;
        }
        if (scannedBytes >= 32 * 1024 * 1024) { truncated = true; break; }
        try {
          const stat = await fs.stat(full);
          if (stat.size > 256 * 1024) { skipped++; continue; }
          const result = await workspaceFile(root, file, 'read');
          scannedBytes += result.size || 0;
          if (typeof result.text !== 'string' || !result.revision) { skipped++; continue; }
          const lines = result.text.split(/\r?\n/);
          for (let index = 0; index < lines.length; index++) {
            const column = lines[index].toLowerCase().indexOf(term);
            if (column < 0) continue;
            if (entries.length >= 200) { truncated = true; break; }
            const start = Math.max(0, column - 60);
            entries.push({ name: entry.name, path: file, directory: false, symlink: false, line: index + 1, column: column + 1, snippet: (start ? '…' : '') + lines[index].slice(start, start + 300) });
          }
        } catch { skipped++; }
      }
    }
    return { entries: entries.sort((a, b) => a.path.localeCompare(b.path) || (a.line || 0) - (b.line || 0)), truncated, skipped };
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
    let editable = stat.size === bytesRead;
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { editable = false; }
    return { text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes), revision: editable ? revision(bytes) : undefined, truncated: stat.size > bytesRead, size: stat.size };
  } finally { await handle.close(); }
}
module.exports = { workspaceFile };
