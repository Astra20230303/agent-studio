const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createThreadStore } = require('../src/threadStore.ts');
const { readPermissionUpdate } = require('../src/threadPermissionUpdate.ts');
const effective = () => ({ sandboxPolicy: { type: 'workspaceWrite' }, approvalPolicy: 'on-request', approvalsReviewer: 'auto_review' });

test('permission confirmation requires all effective settings and returns an isolated snapshot', () => {
  for (const value of [null, {}, { ...effective(), sandboxPolicy: { type: 'readOnly' } }, { ...effective(), approvalPolicy: 'never' }, { ...effective(), approvalsReviewer: 'user' }, { ...effective(), approvalsReviewer: undefined }]) {
    assert.throws(() => readPermissionUpdate(value, 'workspace-write'), /未得到有效确认/);
  }
  const value = effective();
  const result = readPermissionUpdate(value, 'workspace-write');
  value.sandboxPolicy.type = 'dangerFullAccess';
  assert.equal(result.sandbox, 'workspaceWrite');
});

test('permission update holds shared alias lock, captures identity, and releases after failure', async () => {
  let release;
  const calls = [];
  const store = createThreadStore({ changePermission: (...args) => { calls.push(args); return new Promise(resolve => { release = resolve; }); } }, () => { throw Error('unexpected state mutation'); });
  const source = { id: 'local', remoteId: 'remote' };
  const pending = store.changePermission(source, 'workspace-write');
  source.remoteId = 'changed';
  const alias = { id: 'alias', remoteId: 'remote' };
  await assert.rejects(store.changePermission(alias, 'on-request'), /尚未完成/);
  await assert.rejects(store.switchProvider(alias, 'b', 'model'), /尚未完成/);
  await assert.rejects(store.rename(source, 'title'), /尚未完成/);
  await assert.rejects(store.archive(alias), /尚未完成/);
  release({}); await assert.rejects(pending, /未得到有效确认/);
  const retry = store.changePermission(alias, 'workspace-write');
  release(effective()); assert.equal((await retry).reviewer, 'auto_review');
  assert.deepEqual(calls, [['remote', 'workspace-write'], ['remote', 'workspace-write']]);
});
