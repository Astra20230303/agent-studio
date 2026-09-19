const test = require('node:test');
const assert = require('node:assert/strict');
const { readEnvironmentInfo, readEnvironmentStatus } = require('../src/environment.ts');
test('environment responses validate shell, cwd and status', () => {
  assert.deepEqual(readEnvironmentInfo({ shell: { name: 'powershell', path: 'C:/pwsh.exe' }, cwd: 'file:///C:/work' }), { shell: { name: 'powershell', path: 'C:/pwsh.exe' }, cwd: 'file:///C:/work' });
  assert.deepEqual(readEnvironmentStatus({ status: 'disconnected', error: 'offline' }), { status: 'disconnected', error: 'offline' });
  for (const value of [null, {}, { shell: { name: '', path: 'x' } }, { shell: { name: 'sh', path: 'x' }, cwd: '' }, { status: 'bad' }, { status: 'ready', error: '' }]) assert.throws(() => value?.status ? readEnvironmentStatus(value) : readEnvironmentInfo(value));
});
