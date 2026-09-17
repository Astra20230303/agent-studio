const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { findCommand } = require('../electron/codex-server.cjs');

async function bundleRuntime({ projectRoot = path.resolve(__dirname, '../..'), output, node = process.execPath } = {}) {
  if (!output || !path.isAbsolute(output)) throw new Error('Output must be an absolute path');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new directory');
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const codex = findCommand(projectRoot, null).command;
  const nodeVersion = execFileSync(node, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  if (!/^v\d+\.\d+\.\d+$/.test(nodeVersion)) throw new Error('Unrecognized Node version');
  const nodeLicenseUrl = `https://raw.githubusercontent.com/nodejs/node/${nodeVersion}/LICENSE`;
  const licenseResponse = await fetch(nodeLicenseUrl, { signal: AbortSignal.timeout(30000) });
  if (!licenseResponse.ok) throw new Error(`Node license download failed: ${licenseResponse.status}`);
  const nodeLicense = await licenseResponse.text();
  if (!nodeLicense.includes('Node.js') || !nodeLicense.includes('Permission is hereby granted')) throw new Error('Invalid Node license response');
  const codexVersion = execFileSync(codex, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  const sources = {
    [`bin/codex${suffix}`]: codex,
    [`bin/node${suffix}`]: node,
    'models.json': path.join(projectRoot, 'codex-upstream/codex-rs/models-manager/models.json'),
    'electron/web-search-mcp.cjs': path.join(projectRoot, 'desktop/electron/web-search-mcp.cjs'),
    'electron/remote-desktop-mcp.cjs': path.join(projectRoot, 'desktop/electron/remote-desktop-mcp.cjs'),
    'licenses/codex-LICENSE': path.join(projectRoot, 'codex-upstream/LICENSE'),
    'licenses/codex-NOTICE': path.join(projectRoot, 'codex-upstream/NOTICE'),
  };
  for (const source of Object.values(sources)) if (!fs.statSync(source).isFile()) throw new Error(`Not a file: ${source}`);
  const catalog = JSON.parse(fs.readFileSync(sources['models.json'], 'utf8'));
  if (!Array.isArray(catalog.models) || !catalog.models.length) throw new Error('Invalid model catalog');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output);
  const manifest = { version: 1, platform: process.platform, arch: process.arch, nodeVersion, codexVersion, nodeLicenseUrl, files: {} };
  try {
  for (const [relative, source] of Object.entries(sources)) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    const bytes = fs.readFileSync(target);
    manifest.files[relative] = { size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  const licenseBytes = Buffer.from(nodeLicense);
  fs.writeFileSync(path.join(output, 'licenses/node-LICENSE'), licenseBytes, { flag: 'wx' });
  manifest.files['licenses/node-LICENSE'] = { size: licenseBytes.length, sha256: crypto.createHash('sha256').update(licenseBytes).digest('hex') };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
  } catch (error) {
    // Only remove the fresh directory created by this invocation.
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    const output = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-runtime'));
    const manifest = await bundleRuntime({ output });
    console.log(`Runtime created: ${output}\n${manifest.codexVersion}; Node ${manifest.nodeVersion}; ${Object.keys(manifest.files).length} files`);
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { bundleRuntime };
