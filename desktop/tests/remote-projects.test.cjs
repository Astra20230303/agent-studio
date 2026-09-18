const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteProjectPage } = require('../src/remoteProjects.ts');

test('remote project pages validate roots, metadata, timestamps and cursors', () => {
  const wireProject = { id: 'p', name: 'Felix', roots: [{ path: 'D:/repo' }], metadata: { team: 'core', empty: '' }, position: 0, createdAt: 1, updatedAt: 2, recencyAt: 3 };
  const project = { ...wireProject, roots: ['D:/repo'] };
  assert.deepEqual(readRemoteProjectPage({ data: [wireProject], nextCursor: 'next' }), { data: [project], nextCursor: 'next' });
  for (const value of [null, {}, { data: [{ ...wireProject, id: ' ' }] }, { data: [{ ...wireProject, roots: ['D:/repo'] }] }, { data: [{ ...wireProject, roots: [{ path: '' }] }] }, { data: [{ ...wireProject, metadata: { team: 1 } }] }, { data: [{ ...wireProject, position: 1.2 }] }, { data: [], nextCursor: {} }]) assert.throws(() => readRemoteProjectPage(value), /远端项目/);
});
