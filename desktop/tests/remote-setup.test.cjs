const test = require('node:test');
const assert = require('node:assert/strict');
const { targetArgs } = require('../electron/remote-setup.cjs');
test('SSH arguments keep host/user separate and require verified host keys', () => {
  const args = targetArgs({ host: '10.0.90.243', username: 'bianbu' });
  assert.ok(args.includes('StrictHostKeyChecking=yes'));
  assert.deepEqual(args.slice(-3), ['-l', 'bianbu', '10.0.90.243']);
});
test('reject option and command injection in remote target', () => {
  for (const host of ['-oProxyCommand=cmd', 'host;id', 'host$(id)', 'user@host', 'http://host']) assert.throws(() => targetArgs({ host }));
  assert.throws(() => targetArgs({ host: 'host', username: 'user;id' }));
  assert.throws(() => targetArgs({ host: 'host', sshPort: 0 }));
});
