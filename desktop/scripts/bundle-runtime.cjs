const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { findCommand } = require('../electron/codex-server.cjs');

function bundleRuntime({ projectRoot = path.resolve(__dirname, '../..'), output, node = process.execPath } = {}) {
  if (!output || !path.isAbsolute(output)) throw new Error('Output must be an absolute path');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new directory');
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const codex = findCommand(projectRoot, null).command;
  const nodeVersion = execFileSync(node, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  const codexVersion = execFileSync(codex, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  const sources = {
    [`bin/codex${suffix}`]: codex,
    [`bin/node${suffix}`]: node,
    'models.json': path.join(projectRoot, 'codex-upstream/codex-rs/models-manager/models.json'),
    'electron/web-search-mcp.cjs': path.join(projectRoot, 'desktop/electron/web-search-mcp.cjs'),
    'electron/remote-desktop-mcp.cjs': path.join(projectRoot, 'desktop/electron/remote-desktop-mcp.cjs'),
    'licenses/codex-LICENSE': path.join(projectRoot, 'codex-upstream/LICENSE'),
  };
  for (const source of Object.values(sources)) if (!fs.statSync(source).isFile()) throw new Error(`Not a file: ${source}`);
  const catalog = JSON.parse(fs.readFileSync(sources['models.json'], 'utf8'));
  if (!Array.isArray(catalog.models) || !catalog.models.length) throw new Error('Invalid model catalog');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output);
  const manifest = { version: 1, platform: process.platform, arch: process.arch, nodeVersion, codexVersion, files: {} };
  for (const [relative, source] of Object.entries(sources)) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    const bytes = fs.readFileSync(target);
    manifest.files[relative] = { size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

if (require.main === module) {
  try {
    const output = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-runtime'));
    const manifest = bundleRuntime({ output });
    console.log(`Runtime created: ${output}\n${manifest.codexVersion}; Node ${manifest.nodeVersion}; ${Object.keys(manifest.files).length} files`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { bundleRuntime };
