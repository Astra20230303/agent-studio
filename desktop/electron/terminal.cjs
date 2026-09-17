const pty = require('node-pty');
const fs = require('node:fs');
const path = require('node:path');

class TerminalManager {
  constructor(send) { this.send = send; this.sessions = new Map(); this.closing = new Set(); this.nextId = 1; }
  create(cwd) {
    cwd ||= process.cwd();
    if (typeof cwd !== 'string' || !path.isAbsolute(cwd) || !fs.statSync(cwd).isDirectory()) throw Error('Terminal working directory must be an existing absolute directory');
    if (this.sessions.size >= 8) throw Error('Too many terminal sessions');
    const id = `terminal-${this.nextId++}`;
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
    const args = process.platform === 'win32' ? ['-NoLogo', '-NoProfile'] : [];
    const session = pty.spawn(shell, args, { name: 'xterm-color', cols: 100, rows: 30, cwd: cwd || process.cwd(), env: process.env, useConptyDll: true });
    session.onData(data => this.send({ id, type: 'data', data }));
    session.done = new Promise(resolve => session.onExit(event => { this.send({ id, type: 'exit', code: event.exitCode }); this.sessions.delete(id); resolve(); }));
    this.sessions.set(id, session);
    return { id };
  }
  write(id, data) {
    if (typeof data !== 'string' || data.length > 1024 * 1024) throw Error('Invalid terminal input');
    const session = this.sessions.get(id); if (!session) throw Error('Terminal has exited');
    session.write(data); return { ok: true };
  }
  resize(id, cols, rows) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || cols > 1000 || rows < 1 || rows > 1000) throw Error('Invalid terminal dimensions');
    this.sessions.get(id)?.resize(cols, rows); return { ok: true };
  }
  async close(id) {
    const session = this.sessions.get(id);
    if (!session) return { ok: true };
    this.sessions.delete(id); this.closing.add(session.done);
    try { session.kill(); await session.done; return { ok: true }; }
    finally { this.closing.delete(session.done); }
  }
  async closeAll() { await Promise.all([...this.closing, ...[...this.sessions.keys()].map(id => this.close(id))]); }
}

function registerTerminalIpc(ipcMain, send, defaultCwd) {
  const manager = new TerminalManager(send);
  ipcMain.handle('terminal:create', (_event, input) => ({ ok: true, ...manager.create(input?.cwd || defaultCwd) }));
  ipcMain.handle('terminal:write', (_event, input) => manager.write(input?.id, input?.data));
  ipcMain.handle('terminal:resize', (_event, input) => manager.resize(input?.id, input?.cols, input?.rows));
  ipcMain.handle('terminal:close', (_event, input) => manager.close(input?.id));
  return manager;
}
function wireTerminalWindow(manager, win) {
  // Renderer reload/crash cannot run React effect cleanup reliably.
  const close = () => { void manager.closeAll().catch(error => console.error('Terminal cleanup failed:', error)); };
  win.webContents.on('did-start-loading', close);
  win.webContents.on('render-process-gone', close);
  win.on('closed', close);
}
module.exports = { TerminalManager, registerTerminalIpc, wireTerminalWindow };
