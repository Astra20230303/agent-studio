const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');

test('failed RPC closes its adapter and child before a replacement starts', () => {
  const filename = path.resolve(__dirname, '../electron/codex-server.cjs');
  const adapters = [], children = [];
  class Rpc extends EventEmitter {
    constructor(child) { super(); this.child = child; }
    close() { this.emit('closed'); }
  }
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, process: { ...process, env: { ...process.env, CODEX_APP_SERVER_COMMAND: 'D:/fixture/test-codex' } },
    require: name => {
      if (name === 'node:fs') return { existsSync: () => true, mkdirSync() {}, writeFileSync() {}, readFileSync: () => JSON.stringify({ models: [] }) };
      if (name === 'node:child_process') return { spawn: () => { const child = Object.assign(new EventEmitter(), { killed: false, kill() { this.killed = true; } }); children.push(child); return child; } };
      if (name === './codex-rpc.cjs') return { CodexRpc: Rpc };
      if (name === './minimax-adapter.cjs') return { startMiniMaxAdapter: () => { const adapter = { closed: 0, close() { this.closed++; } }; adapters.push(adapter); return adapter; } };
      if (name === './provider-config.cjs') return { readProvider: () => ({}) };
      return createRequire(filename)(name);
    },
  }, { filename });
  const server = new module.exports.CodexServer('D:/fixture');
  const first = server.start(); first.emit('closed');
  assert.equal(adapters[0].closed, 1); assert.equal(children[0].killed, true);
  assert.equal(server.rpc, null);
  const second = server.start();
  assert.notEqual(first, second);
  // Late old-process shutdown must not clear the replacement.
  first.emit('closed'); assert.equal(server.rpc, second);
  server.stop(); assert.equal(adapters[1].closed, 1); assert.equal(children[1].killed, true);
});
