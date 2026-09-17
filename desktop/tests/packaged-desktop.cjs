const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const source = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-packaged-'));
  const directory = path.join(profile, 'relocated app');
  fs.cpSync(source, directory, { recursive: true, dereference: true });
  const env = { ...process.env, FELIX_DATA_DIR: profile };
  for (const key of ['ELECTRON_RUN_AS_NODE', 'FELIX_RUNTIME_DIR', 'CODEX_APP_SERVER_COMMAND', 'VITE_DEV_SERVER_URL', 'MINIMAX_API_KEY', 'NODE_PATH']) delete env[key];
  let app;
  try {
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    const page = await app.firstWindow(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
    await page.getByRole('button', { name: '已安排', exact: true }).waitFor();
    const connected = await page.evaluate(() => window.codex.connect());
    assert.equal(connected.ok, true, JSON.stringify(connected));
    const models = await page.evaluate(() => window.codex.request('model/list', {}));
    assert.equal(models.ok, true); assert.ok(models.result.data.length);
    await page.evaluate(async cwd => {
      window.__terminalOutput = '';
      window.desktop.terminal.onData(event => { window.__terminalOutput += event.data || ''; });
      const result = await window.desktop.terminal.create(cwd);
      if (!result.ok) throw Error(result.error);
      window.__terminalId = result.id;
      await window.desktop.terminal.write(result.id, "Write-Output ('PACKAGED_' + 'PTY_OK')\r");
    }, profile);
    await page.waitForFunction(() => window.__terminalOutput.includes('PACKAGED_PTY_OK'));
    await page.evaluate(() => window.desktop.terminal.close(window.__terminalId));
    const saved = await page.evaluate(() => window.desktop.saveTask({ name: 'Packaged reminder', prompt: 'Restore packaged task', kind: 'reminder', model: '', permission: 'read-only', notify: false, schedule: { kind: 'once', at: new Date(Date.now() + 86400000).toISOString() } }));
    assert.equal(saved.ok, true);
    assert.deepEqual(errors, []);
    await app.close(); app = undefined;
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    const restarted = await app.firstWindow();
    await restarted.waitForFunction(() => window.desktop?.taskDetail);
    const restored = await restarted.evaluate(id => window.desktop.taskDetail(id), saved.task.id);
    assert.equal(restored.task.name, 'Packaged reminder');
    assert.equal(restored.task.runs.length, 0);
    assert.equal(fs.existsSync(path.join(directory, 'resources/.project-cache')), false);
    console.log('PASS: relocated packaged UI, bundled app-server, native terminal and reminder persistence after restart');
  } finally { if (app) await app.close(); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
