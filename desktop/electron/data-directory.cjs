const path = require('node:path');

function dataDirectory(projectRoot, { isPackaged = false, appData, override = process.env.FELIX_DATA_DIR } = {}) {
  if (override !== undefined && override !== '') {
    if (!path.isAbsolute(override)) throw new Error('FELIX_DATA_DIR must be an absolute path');
    return path.resolve(override);
  }
  if (isPackaged) {
    if (!appData || !path.isAbsolute(appData)) throw new Error('A system application data directory is required');
    return path.join(appData, 'Felix');
  }
  return path.join(projectRoot, '.project-cache');
}

module.exports = { dataDirectory };
