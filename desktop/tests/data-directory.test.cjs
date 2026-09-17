const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { dataDirectory } = require('../electron/data-directory.cjs');
const { CodexServer } = require('../electron/codex-server.cjs');

test('development keeps existing data; packaged data is independent of install location', () => {
  const project = path.join(os.tmpdir(), 'source');
  const appData = path.join(os.tmpdir(), 'system-profile');
  assert.equal(dataDirectory(project, { override: '' }), path.join(project, '.project-cache'));
  for (const install of ['install-one', 'install-two']) {
    assert.equal(dataDirectory(path.join(os.tmpdir(), install), { isPackaged: true, appData, override: '' }), path.join(appData, 'Felix'));
  }
  assert.throws(() => dataDirectory(project, { isPackaged: true, override: '' }), /application data/);
});

test('explicit absolute data root wins and CodexServer uses it', () => {
  const root = path.join(os.tmpdir(), 'felix data');
  assert.equal(dataDirectory(__dirname, { isPackaged: true, override: root }), root);
  assert.equal(new CodexServer(__dirname, { dataRoot: root }).dataRoot, root);
  assert.throws(() => dataDirectory(__dirname, { override: '../relative' }), /absolute path/);
});
