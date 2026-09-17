const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verifyRuntime(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error('Runtime manifest version/platform/architecture mismatch');
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const required = [`bin/codex${suffix}`, `bin/node${suffix}`, 'models.json', 'electron/web-search-mcp.cjs', 'electron/remote-desktop-mcp.cjs', 'licenses/codex-LICENSE'];
  required.push('licenses/codex-NOTICE', 'licenses/node-LICENSE');
  if (!manifest.files || required.some(file => !manifest.files[file])) throw new Error('Runtime manifest is incomplete');
  for (const [relative, entry] of Object.entries(manifest.files)) {
    if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid runtime manifest path');
    const file = path.join(root, relative);
    const bytes = fs.readFileSync(file);
    if (bytes.length !== entry.size || crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Runtime integrity check failed: ${relative}`);
  }
  return manifest;
}

if (require.main === module) {
  try {
    const root = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-runtime'));
    const manifest = verifyRuntime(root);
    console.log(`Verified ${Object.keys(manifest.files).length} runtime files: ${root}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { verifyRuntime };
