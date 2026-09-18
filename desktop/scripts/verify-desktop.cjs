const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MANIFEST = 'release-manifest.json';
const required = ['Felix.exe', 'desktop-manifest.json', 'resources/app/package.json', 'resources/app/dist/index.html', 'resources/app/electron/main.cjs', 'resources/felix-runtime/manifest.json'];
function digest(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r'); const buffer = Buffer.alloc(1024 * 1024); let size = 0;
  try { let length; while ((length = fs.readSync(fd, buffer)) > 0) { size += length; hash.update(buffer.subarray(0, length)); } }
  finally { fs.closeSync(fd); }
  return { size, sha256: hash.digest('hex') };
}
function inventory(root) {
  const files = [];
  function visit(directory, prefix = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const relative = prefix + name;
      const file = path.join(directory, name); const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw Error(`Package links are not supported: ${relative}`);
      if (stat.isDirectory()) visit(file, relative + '/');
      else if (stat.isFile()) { if (relative !== MANIFEST) files.push(relative); }
      else throw Error(`Unsupported package entry: ${relative}`);
    }
  }
  visit(root); return files.sort();
}
function writeDesktopManifest(root) {
  const files = inventory(root);
  if (required.some(file => !files.includes(file))) throw Error('Desktop package is incomplete');
  const manifest = { format: 1, files: Object.fromEntries(files.map(file => [file, digest(path.join(root, file))])) };
  fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}
function verifyDesktop(root) {
  const manifestFile = path.join(root, MANIFEST);
  if (!fs.lstatSync(manifestFile).isFile() || fs.lstatSync(manifestFile).isSymbolicLink()) throw Error('Invalid desktop release manifest');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.format !== 1 || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) throw Error('Invalid desktop release manifest');
  const expected = Object.keys(manifest.files).sort();
  for (const relative of expected) {
    const entry = manifest.files[relative];
    if (!relative || /[\\:\0]/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..') || relative === MANIFEST
      || !entry || !Number.isSafeInteger(entry.size) || entry.size < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Invalid desktop manifest entry');
  }
  if (required.some(file => !expected.includes(file))) throw Error('Desktop manifest is incomplete');
  if (JSON.stringify(inventory(root)) !== JSON.stringify(expected)) throw Error('Desktop package file inventory mismatch');
  for (const relative of expected) {
    const actual = digest(path.join(root, relative)); const entry = manifest.files[relative];
    if (actual.size !== entry.size || actual.sha256 !== entry.sha256) throw Error(`Desktop integrity check failed: ${relative}`);
  }
  return manifest;
}
if (require.main === module) {
  try { const root = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop')); console.log(`Verified ${Object.keys(verifyDesktop(root).files).length} desktop files: ${root}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { digest, writeDesktopManifest, verifyDesktop };
