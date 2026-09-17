const fs = require('node:fs');
const path = require('node:path');

function runtimeDirectory({ isPackaged = false, resourcesPath, override = process.env.FELIX_RUNTIME_DIR } = {}) {
  if (override) {
    if (!path.isAbsolute(override)) throw new Error('FELIX_RUNTIME_DIR must be an absolute path');
    return path.resolve(override);
  }
  if (isPackaged) return path.join(resourcesPath, 'felix-runtime');
}

function runtimeFile(root, ...segments) {
  const file = path.join(root, ...segments);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Felix runtime file missing: ${file}`);
  return file;
}

module.exports = { runtimeDirectory, runtimeFile };
