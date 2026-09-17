const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-packaged-'));
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
    assert.deepEqual(errors, []);
    console.log('PASS: packaged Electron UI, bundled app-server model list and native terminal command');
  } finally { if (app) await app.close(); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
