const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(require('electron'), [__filename], { env, encoding: 'utf8', timeout: 25000, windowsHide: true });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  assert.equal(result.status, 0, result.error?.message || 'Electron terminal smoke failed');
} else {
  const { app } = require('electron');
  const { TerminalManager } = require('../electron/terminal.cjs');
  app.whenReady().then(async () => {
    let output = '';
    const manager = new TerminalManager(event => { if (event.data) output += event.data; });
    try {
      const { id } = manager.create(process.cwd());
      const pid = manager.sessions.get(id).pid;
      const deadline = Date.now() + 10000;
      manager.write(id, "Write-Output ('ELECTRON_' + 'PTY_OK')\r");
      while (!output.includes('ELECTRON_PTY_OK') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
      assert.ok(output.includes('ELECTRON_PTY_OK'), output);
      manager.close(id);
      let alive = true;
      while (alive && Date.now() < deadline) { try { process.kill(pid, 0); await new Promise(resolve => setTimeout(resolve, 50)); } catch { alive = false; } }
      assert.equal(alive, false, 'Shell must exit after terminal close');
      console.log('PASS: Electron native PTY load, real shell command and process cleanup');
      app.exit(0);
    } catch (error) { console.error(error); manager.closeAll(); app.exit(1); }
  });
}
