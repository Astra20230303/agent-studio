const test = require('node:test');
const assert = require('node:assert/strict');
const { workspaceFor, remoteProjectIdFor } = require('../src/workspace.ts');
const state = { activeProjectId: 'b', projects: [{ id: 'a', path: 'D:/A' }, { id: 'b', path: 'D:/B' }] };
test('new thread uses selected project while existing threads retain their root', () => {
  assert.equal(workspaceFor(state), 'D:/B');
  assert.equal(workspaceFor(state, { cwd: 'D:/A', remoteId: 'remote' }), 'D:/A');
  assert.equal(workspaceFor(state, { projectId: 'a', remoteId: 'remote' }), 'D:/A');
});
test('unknown resumed root is not replaced by unrelated selected project', () => {
  assert.equal(workspaceFor(state, { remoteId: 'remote' }), undefined);
});

test('local project identities never become server project IDs, including removed path entries', () => {
  for (const id of ['a', 'b', 'D:\\Workspace2026\\my-agent-plantform', 'D:/project with spaces', '/tmp/project', '\\\\server\\share\\project', undefined]) {
    assert.equal(remoteProjectIdFor(state, id), undefined);
  }
  assert.equal(remoteProjectIdFor(state, 'server-project-id'), 'server-project-id');
  assert.equal(workspaceFor(state, { projectId: 'a' }), 'D:/A');
});
