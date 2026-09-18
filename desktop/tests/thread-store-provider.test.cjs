const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createThreadStore } = require('../src/threadStore.ts');
const { readThreadProvider } = require('../src/threadProvider.ts');
const response = () => ({ thread: { id: 'remote' }, providerId: 'b', model: 'beta', sandbox: { type: 'readOnly' }, approvalPolicy: 'never' });

test('provider confirmation must identify requested thread, provider and model', () => {
  for (const value of [null, {}, { ...response(), thread: { id: 'wrong' } }, { ...response(), providerId: 'a' }, { ...response(), providerId: {} }, ...[undefined, '', 42, 'different'].map(model => ({ ...response(), model }))]) {
    assert.throws(() => readThreadProvider(value, 'remote', 'b', 'beta'), /切换确认无效/);
  }
  const value = response();
  const result = readThreadProvider(value, 'remote', 'b', 'beta');
  value.sandbox.type = 'dangerFullAccess';
  assert.deepEqual(result, { providerId: 'b', model: 'beta', permissions: { sandbox: 'readOnly', approvalPolicy: 'never', reviewer: 'unknown' } });
});

test('switch shares identity lock, snapshots source and releases after invalid confirmation', async () => {
  let release;
  let calls = 0;
  const store = createThreadStore({ switchProvider: async (...args) => { calls++; assert.deepEqual(args, ['remote', 'b', 'beta']); return new Promise(resolve => { release = resolve; }); } }, () => { throw Error('unexpected state write'); });
  const source = { id: 'local', remoteId: 'remote' };
  const pending = store.switchProvider(source, 'b', 'beta');
  source.remoteId = 'changed';
  for (const identity of [{ id: 'alias', remoteId: 'remote' }, source]) {
    await assert.rejects(store.switchProvider(identity, 'b', 'beta'), /尚未完成/);
    await assert.rejects(store.rename(identity, 'changed'), /尚未完成/);
    await assert.rejects(store.archive(identity), /尚未完成/);
    await assert.rejects(store.fork(identity), /尚未完成/);
  }
  release({ ...response(), providerId: 'a' });
  await assert.rejects(pending, /切换确认无效/);
  const retry = store.switchProvider({ id: 'local', remoteId: 'remote' }, 'b', 'beta');
  release(response());
  assert.equal((await retry).providerId, 'b');
  assert.equal(calls, 2);
});
