const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  assert.equal(result.status, 0, result.error?.message || 'IPC acceptance failed');
} else {
  const { app, BrowserWindow, ipcMain } = require('electron');
  app.on('window-all-closed', () => {});
  const { registerTerminalIpc, wireTerminalWindow } = require('../electron/terminal.cjs');
  const delay = () => new Promise(resolve => setTimeout(resolve, 50));
  app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { preload: require('node:path').resolve(__dirname, '../electron/preload.cjs'), contextIsolation: true, sandbox: true } });
    const manager = registerTerminalIpc(ipcMain, message => { if (!win.isDestroyed()) win.webContents.send('terminal:data', message); }, process.cwd());
    wireTerminalWindow(manager, win);
    const js = code => win.webContents.executeJavaScript(code);
    try {
      await win.loadURL('about:blank');
      await js('window.events = []; window.desktop.terminal.onData(event => window.events.push(event)); void 0;');
      const { id } = await js('window.desktop.terminal.create()');
      const pid = manager.sessions.get(id).pid;
      await js(`window.desktop.terminal.write(${JSON.stringify(id)}, ${JSON.stringify("Write-Output ('IPC_' + 'OK')\r")})`);
      const deadline = Date.now() + 10000;
      while (!(await js("window.events.some(e => e.data?.includes('IPC_OK'))")) && Date.now() < deadline) await delay();
      assert.ok(await js("window.events.some(e => e.data?.includes('IPC_OK'))"));
      await assert.rejects(js('window.desktop.terminal.create("relative-folder")'));
      await js(`window.desktop.terminal.resize(${JSON.stringify(id)}, 80, 24)`);
      await win.loadURL('about:blank');
      assert.equal(manager.sessions.size, 0);
      let alive = true;
      while (alive && Date.now() < deadline) { try { process.kill(pid, 0); await delay(); } catch { alive = false; } }
      assert.equal(alive, false, 'Renderer navigation must terminate shell');
      await js('window.desktop.terminal.create()');
      assert.equal(manager.sessions.size, 1);
      win.destroy();
      await manager.closeAll();
      assert.equal(manager.sessions.size, 0);
      console.log('PASS: production preload/IPC shell IO, invalid cwd rejection, reload and window close cleanup');
      app.exit(0);
    } catch (error) { console.error(error); await manager.closeAll(); win.destroy(); app.exit(1); }
  });
}
