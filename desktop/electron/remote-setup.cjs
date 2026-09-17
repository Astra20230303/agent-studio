const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

function targetArgs({ host, username, sshPort = 22 }) {
  if (typeof host !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(host)) throw new Error('Provide a hostname or IPv4 address, without a URL or shell characters.');
  if (username != null && !/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(username)) throw new Error('Invalid SSH username.');
  if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) throw new Error('Invalid SSH port.');
  return ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2', '-p', String(sshPort), ...(username ? ['-l', username] : []), host];
}

class RemoteSetup {
  constructor() { this.job = null; this.tunnel = null; this.controller = null; }
  stop() { this.controller?.abort(); this.job?.kill(); this.tunnel?.kill(); this.job = null; this.tunnel = null; }
  async prepare(target, progress) {
    const args = targetArgs(target);
    this.stop();
    const controller = new AbortController(); this.controller = controller;
    const signal = controller.signal;
    progress('正在通过 SSH 检查和安装远程桌面组件…');
    const output = await new Promise((resolve, reject) => {
      const child = spawn('ssh', [...args, 'sh', '-s'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], signal });
      this.job = child;
      let output = '';
      const timer = setTimeout(() => controller.abort(), 270000);
      const collect = data => { output = (output + data.toString()).slice(-24000); };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      child.stdin.on('error', () => {});
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => {
        clearTimeout(timer); if (this.job === child) this.job = null;
        if (code === 0) resolve(output);
        else reject(new Error(`Remote setup failed. Verify SSH key login, known_hosts and sudo permissions.\n${output.slice(-4000)}`));
      });
      child.stdin.end(fs.readFileSync(path.join(__dirname, 'remote-setup.sh'), 'utf8').replace(/\r\n/g, '\n'));
    });
    signal.throwIfAborted();
    const ready = output.match(/^FELIX_READY (\{[^\n]+\})/m);
    if (!ready) throw new Error('Remote setup returned no readiness confirmation.');
    const remote = JSON.parse(ready[1]);
    if (!Number.isInteger(remote.web) || remote.web < 1 || remote.web > 65535) throw new Error('Invalid remote tunnel port.');
    const local = await new Promise((resolve, reject) => {
      const server = net.createServer(); server.on('error', reject);
      server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
    });
    signal.throwIfAborted(); progress('远程组件已就绪，正在建立 SSH 隧道…');
    const child = spawn('ssh', ['-N', '-o', 'ExitOnForwardFailure=yes', '-L', `127.0.0.1:${local}:127.0.0.1:${remote.web}`, ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], signal });
    this.tunnel = child;
    let failure = ''; let exited = false;
    child.stderr.on('data', data => { failure = (failure + data.toString()).slice(-2000); });
    child.on('error', error => { failure = error.message; exited = true; });
    child.on('exit', () => { exited = true; });
    const url = `http://127.0.0.1:${local}/vnc.html`;
    try {
      for (let attempt = 0; attempt < 40; attempt++) {
        signal.throwIfAborted();
        if (exited) throw new Error(`SSH tunnel failed: ${failure}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]) });
          if (response.ok && (await response.text()).includes('noVNC')) return url;
        } catch (error) { signal.throwIfAborted(); }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      throw new Error('SSH tunnel did not become ready.');
    } catch (error) { this.stop(); throw error; }
  }
}
module.exports = { RemoteSetup, targetArgs };
