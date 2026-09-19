const test = require('node:test');
const assert = require('node:assert/strict');
const { environmentAddParams, readEnvironmentInfo, readEnvironmentStatus } = require('../src/environment.ts');
test('environment responses validate shell, cwd and status', () => {
  assert.deepEqual(readEnvironmentInfo({ shell: { name: 'powershell', path: 'C:/pwsh.exe' }, cwd: 'file:///C:/work' }), { shell: { name: 'powershell', path: 'C:/pwsh.exe' }, cwd: 'file:///C:/work' });
  assert.deepEqual(readEnvironmentStatus({ status: 'disconnected', error: 'offline' }), { status: 'disconnected', error: 'offline' });
  for (const value of [null, {}, { shell: { name: '', path: 'x' } }, { shell: { name: 'sh', path: 'x' }, cwd: '' }, { status: 'bad' }, { status: 'ready', error: '' }]) assert.throws(() => value?.status ? readEnvironmentStatus(value) : readEnvironmentInfo(value));
  assert.deepEqual(environmentAddParams('remote', 'wss://example.test/exec', 5000), { environmentId: 'remote', execServerUrl: 'wss://example.test/exec', connectTimeoutMs: 5000 });
  for (const value of [['', 'wss://example.test'], ['remote', 'https://example.test'], ['remote', 'wss://example.test', 0]]) assert.throws(() => environmentAddParams(...value));
});
test('environment diagnostics preserve long paths and multiline errors', () => {
  const cwd = 'file:///C:/' + 'long-directory/'.repeat(40);
  assert.equal(readEnvironmentInfo({ shell: { name: 'sh', path: '/bin/sh' }, cwd }).cwd, cwd);
  const error = 'connection refused\n' + 'details '.repeat(80);
  assert.equal(readEnvironmentStatus({ status: 'disconnected', error }).error, error);
});
