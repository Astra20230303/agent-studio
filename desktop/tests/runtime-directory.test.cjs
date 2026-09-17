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
  fs.mkdirSync(home);
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const { bundleRuntime } = require('../scripts/bundle-runtime.cjs');
  const manifest = await bundleRuntime({ projectRoot: source, output: bundle });
  const { verifyRuntime } = require('../scripts/verify-runtime.cjs');
  assert.deepEqual(verifyRuntime(bundle), manifest);
  for (const [relative, entry] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(path.join(bundle, relative));
    assert.equal(bytes.length, entry.size);
    assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
  await assert.rejects(bundleRuntime({ projectRoot: source, output: bundle }), /already exists/);
  let child, rpc;
  try {
    fs.writeFileSync(path.join(home, 'config.toml'), '[mcp_servers.custom]\ncommand = "custom-command"\n\n[mcp_servers.felix_remote_desktop]\ncommand = "old-node"\nargs = ["old-script"]\nenabled = false\nstartup_timeout_sec = 45\n');
    ensureProjectConfig(home, scratch, bundle);
    const catalog = compatibilityCatalog(scratch, home, bundle);
    const config = fs.readFileSync(path.join(home, 'config.toml'), 'utf8');
    assert.ok(config.includes(JSON.stringify(path.join(bundle, 'bin', 'node' + suffix))));
    assert.ok(!config.includes(JSON.stringify(source).slice(1, -1)));
    assert.match(config, /command = "custom-command"/);
    assert.match(config, /enabled = false/);
    assert.match(config, /startup_timeout_sec = 45/);
    assert.doesNotMatch(config, /old-node|old-script/);
    ensureProjectConfig(home, scratch, bundle);
    assert.equal(fs.readFileSync(path.join(home, 'config.toml'), 'utf8'), config);
    for (const script of ['web-search-mcp.cjs', 'remote-desktop-mcp.cjs']) {
      const bridge = spawn(path.join(bundle, 'bin', 'node' + suffix), [path.join(bundle, 'electron', script)], { cwd: scratch, windowsHide: true });
      const bridgeRpc = new CodexRpc(bridge);
      try {
        const hello = await bridgeRpc.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'runtime-test', version: '1' } });
        assert.ok(hello.serverInfo.name);
        const result = await bridgeRpc.request('tools/list', {});
        assert.ok(result.tools.length > 0);
      } finally {
        const exit = once(bridge, 'exit'); bridgeRpc.close(); await exit;
      }
    }
    child = spawn(findCommand(scratch, bundle).command, ['-c', `model_catalog_json=${JSON.stringify(catalog)}`, 'app-server', '--stdio'], { cwd: scratch, env: { ...process.env, CODEX_HOME: home }, windowsHide: true });
    rpc = new CodexRpc(child);
    const result = await rpc.request('initialize', { clientInfo: { name: 'felix_runtime_test', version: '1' }, capabilities: { experimentalApi: true } });
    assert.ok(result);
    rpc.notify('initialized', {});
    const models = await rpc.request('model/list', {});
    assert.ok(models.data.length > 0);
    const script = path.join(bundle, 'electron/web-search-mcp.cjs');
    const original = fs.readFileSync(script);
    fs.appendFileSync(script, '\n// corrupted fixture');
    assert.throws(() => verifyRuntime(bundle), /integrity check failed/);
    fs.writeFileSync(script, original);
    const invalid = structuredClone(manifest); delete invalid.files['models.json'];
    fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify(invalid));
    assert.throws(() => verifyRuntime(bundle), /incomplete/);
    fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify(manifest));
    assert.deepEqual(verifyRuntime(bundle), manifest);
  } finally {
    const exited = child && child.exitCode === null ? once(child, 'exit') : Promise.resolve();
    rpc?.close(); await exited;
    await fs.promises.rm(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
