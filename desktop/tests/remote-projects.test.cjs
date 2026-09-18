const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteProjectPage, createRemoteProjectParams, updateRemoteProjectParams, deleteRemoteProjectParams, moveRemoteProjectParams, readRemoteProjectChange } = require('../src/remoteProjects.ts');
const { updateThreadProjectParams, updateThreadGitParams } = require('../src/threadMetadata.ts');

test('remote project pages validate roots, metadata, timestamps and cursors', () => {
  const wireProject = { id: 'p', name: 'Felix', roots: [{ path: 'D:/repo' }], metadata: { team: 'core', empty: '' }, position: 0, createdAt: 1, updatedAt: 2, recencyAt: 3 };
  const project = { ...wireProject, roots: ['D:/repo'] };
  assert.deepEqual(readRemoteProjectPage({ data: [wireProject], nextCursor: 'next' }), { data: [project], nextCursor: 'next' });
  for (const value of [null, {}, { data: [{ ...wireProject, id: ' ' }] }, { data: [{ ...wireProject, roots: ['D:/repo'] }] }, { data: [{ ...wireProject, roots: [{ path: '' }] }] }, { data: [{ ...wireProject, metadata: { team: 1 } }] }, { data: [{ ...wireProject, position: 1.2 }] }, { data: [], nextCursor: {} }]) assert.throws(() => readRemoteProjectPage(value), /远端项目/);
});

test('remote project mutations use app-server v2 parameter shapes', () => {
  assert.deepEqual(createRemoteProjectParams(' Felix ', ['D:/repo'], { team: '' }, 'key'), { name: 'Felix', roots: [{ path: 'D:/repo' }], metadata: { team: '' }, idempotencyKey: 'key' });
  assert.deepEqual(updateRemoteProjectParams('p', 'Felix 2', ['D:/repo', 'D:/other'], { team: 'core' }), { projectId: 'p', name: 'Felix 2', roots: [{ path: 'D:/repo' }, { path: 'D:/other' }], metadata: { team: 'core' } });
  assert.deepEqual(deleteRemoteProjectParams('p'), { projectId: 'p' });
  assert.deepEqual(moveRemoteProjectParams('p', 'before'), { projectId: 'p', beforeProjectId: 'before' });
  assert.deepEqual(moveRemoteProjectParams('p'), { projectId: 'p' });
  for (const action of [() => createRemoteProjectParams('', [], {}, 'key'), () => updateRemoteProjectParams(' ', 'x', [], {}), () => deleteRemoteProjectParams(' '), () => moveRemoteProjectParams('p', 'p')]) assert.throws(action, /远端项目/);
});

test('remote project change notifications validate identity and change type', () => {
  assert.deepEqual(readRemoteProjectChange({ projectId: 'p', changeType: 'updated' }), { projectId: 'p', changeType: 'updated' });
  assert.equal(readRemoteProjectChange({ projectId: ' ', changeType: 'updated' }), undefined);
  assert.equal(readRemoteProjectChange({ projectId: 'p', changeType: 'moved' }), undefined);
  assert.equal(readRemoteProjectChange(null), undefined);
});

test('thread project association uses empty project id to clear metadata', () => {
  assert.deepEqual(updateThreadProjectParams('thread', 'project'), { threadId: 'thread', projectId: 'project' });
  assert.deepEqual(updateThreadProjectParams('thread', null), { threadId: 'thread', projectId: '' });
  assert.throws(() => updateThreadProjectParams('', 'project'), /会话项目/);
  assert.throws(() => updateThreadProjectParams('thread', ' '), /会话项目/);
});

test('thread Git metadata updates preserve explicit null clears', () => {
  assert.deepEqual(updateThreadGitParams('thread', { sha: 'abc', branch: 'main' }), { threadId: 'thread', gitInfo: { sha: 'abc', branch: 'main' } });
  assert.deepEqual(updateThreadGitParams('thread', { sha: null, branch: null }), { threadId: 'thread', gitInfo: { sha: null, branch: null } });
  assert.throws(() => updateThreadGitParams('thread', { branch: 'bad\nbranch' }), /Git/);
  assert.throws(() => updateThreadGitParams('', { sha: 'abc' }), /Git/);
});
