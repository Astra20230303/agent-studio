const pty = require('node-pty');

class TerminalManager {
  constructor(send) { this.send = send; this.sessions = new Map(); this.nextId = 1; }
  create(cwd) {
    const id = `terminal-${this.nextId++}`;
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
    const args = process.platform === 'win32' ? ['-NoLogo', '-NoProfile'] : [];
    const session = pty.spawn(shell, args, { name: 'xterm-color', cols: 100, rows: 30, cwd: cwd || process.cwd(), env: process.env, useConptyDll: true });
    session.onData(data => this.send({ id, type: 'data', data }));
    session.onExit(event => { this.send({ id, type: 'exit', code: event.exitCode }); this.sessions.delete(id); });
    this.sessions.set(id, session);
    return { id };
  }
  write(id, data) { this.sessions.get(id)?.write(String(data)); return { ok: true }; }
  resize(id, cols, rows) { if (Number.isInteger(cols) && Number.isInteger(rows) && cols > 0 && rows > 0) this.sessions.get(id)?.resize(cols, rows); return { ok: true }; }
  close(id) { this.sessions.get(id)?.kill(); this.sessions.delete(id); return { ok: true }; }
  closeAll() { for (const id of this.sessions.keys()) this.close(id); }
}
module.exports = { TerminalManager };
