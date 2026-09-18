const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteProjectPage } = require('../src/remoteProjects.ts');

test('remote project pages validate roots, metadata, timestamps and cursors', () => {
  const project = { id: 'p', name: 'Felix', roots: ['D:/repo'], metadata: { team: 'core' }, position: 0, createdAt: 1, updatedAt: 2, recencyAt: 3 };
  assert.deepEqual(readRemoteProjectPage({ data: [project], nextCursor: 'next' }), { data: [project], nextCursor: 'next' });
  for (const value of [null, {}, { data: [{ ...project, id: ' ' }] }, { data: [{ ...project, roots: [''] }] }, { data: [{ ...project, metadata: { team: 1 } }] }, { data: [{ ...project, position: 1.2 }] }, { data: [], nextCursor: {} }]) assert.throws(() => readRemoteProjectPage(value), /远端项目/);
});
