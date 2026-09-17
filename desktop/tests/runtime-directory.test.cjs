const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { runtimeDirectory } = require('../electron/runtime-directory.cjs');
const { findCommand, ensureProjectConfig, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { CodexRpc } = require('../electron/codex-rpc.cjs');

test('runtime selection is explicit and incomplete bundles never fall back', () => {
  assert.equal(runtimeDirectory({ override: '' }), undefined);
  assert.throws(() => runtimeDirectory({ override: 'relative' }), /absolute/);
  const root = path.join(os.tmpdir(), 'missing-felix-runtime');
  assert.equal(runtimeDirectory({ isPackaged: true, resourcesPath: root, override: '' }), path.join(root, 'felix-runtime'));
  assert.throws(() => findCommand(path.resolve(__dirname, '../..'), root), /runtime file missing/);
});

test('relocated runtime initializes real app-server without a source tree', { timeout: 30000 }, async () => {
  const source = path.resolve(__dirname, '../..');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-runtime-'));
  const bundle = path.join(scratch, 'runtime with spaces');
  const home = path.join(scratch, 'profile');
  fs.mkdirSync(path.join(bundle, 'bin'), { recursive: true }); fs.mkdirSync(home);
  const suffix = process.platform === 'win32' ? '.exe' : '';
  fs.copyFileSync(findCommand(source).command, path.join(bundle, 'bin', 'codex' + suffix));
  fs.copyFileSync(process.execPath, path.join(bundle, 'bin', 'node' + suffix));
  fs.copyFileSync(path.join(source, 'codex-upstream/codex-rs/models-manager/models.json'), path.join(bundle, 'models.json'));
  fs.mkdirSync(path.join(bundle, 'electron'));
  for (const file of ['web-search-mcp.cjs', 'remote-desktop-mcp.cjs']) fs.copyFileSync(path.join(source, 'desktop/electron', file), path.join(bundle, 'electron', file));
  let child, rpc;
  try {
    ensureProjectConfig(home, scratch, bundle);
    const catalog = compatibilityCatalog(scratch, home, bundle);
    const config = fs.readFileSync(path.join(home, 'config.toml'), 'utf8');
    assert.ok(config.includes(JSON.stringify(path.join(bundle, 'bin', 'node' + suffix))));
    assert.ok(!config.includes(JSON.stringify(source).slice(1, -1)));
    child = spawn(findCommand(scratch, bundle).command, ['-c', `model_catalog_json=${JSON.stringify(catalog)}`, 'app-server', '--stdio'], { cwd: scratch, env: { ...process.env, CODEX_HOME: home }, windowsHide: true });
    rpc = new CodexRpc(child);
    const result = await rpc.request('initialize', { clientInfo: { name: 'felix_runtime_test', version: '1' }, capabilities: { experimentalApi: true } });
    assert.ok(result);
    rpc.notify('initialized', {});
    const models = await rpc.request('model/list', {});
    assert.ok(models.data.length > 0);
  } finally {
    const exited = child && child.exitCode === null ? once(child, 'exit') : Promise.resolve();
    rpc?.close(); await exited;
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
