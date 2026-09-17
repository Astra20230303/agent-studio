const test = require('node:test');
const assert = require('node:assert/strict');
const { workspaceFor } = require('../src/workspace.ts');
const state = { activeProjectId: 'b', projects: [{ id: 'a', path: 'D:/A' }, { id: 'b', path: 'D:/B' }] };
test('new thread uses selected project while existing threads retain their root', () => {
  assert.equal(workspaceFor(state), 'D:/B');
  assert.equal(workspaceFor(state, { cwd: 'D:/A', remoteId: 'remote' }), 'D:/A');
  assert.equal(workspaceFor(state, { projectId: 'a', remoteId: 'remote' }), 'D:/A');
});
test('unknown resumed root is not replaced by unrelated selected project', () => {
  assert.equal(workspaceFor(state, { remoteId: 'remote' }), undefined);
});
