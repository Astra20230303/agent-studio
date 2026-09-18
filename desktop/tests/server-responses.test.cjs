const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServerResponses } = require('../src/serverResponses.ts');
test('shared response lock spans callers, preserves ID types, and releases for retry', async () => {
  const releases = new Map(); const calls = [];
  const service = createServerResponses((id, result) => { calls.push({ id, result }); return new Promise(resolve => releases.set(id, resolve)); });
  const request = { id: 1, method: 'item/commandExecution/requestApproval' };
  const first = service.send(request, 'accept');
  await assert.rejects(service.send({ ...request }, 'decline'), /正在提交/);
  const second = service.send({ ...request, id: '1' }, 'decline');
  releases.get('1')({ ok: true }); await second;
  releases.get(1)({ ok: 'true' }); await assert.rejects(first, /提交失败/);
  const retry = service.send(request, 'decline'); releases.get(1)({ ok: true }); await retry;
  assert.deepEqual(calls.map(call => call.id), [1, '1', 1]);
});
test('permission, question and elicitation payloads are independent snapshots', async () => {
  const calls = []; const service = createServerResponses(async (id, result) => { calls.push(result); return { ok: true }; });
  const permissions = { fileSystem: { write: ['D:/project'] } };
  await service.send({ id: 1, method: 'item/permissions/requestApproval', params: { permissions } }, 'accept');
  permissions.fileSystem.write.push('D:/other'); assert.equal(calls[0].permissions.fileSystem.write.length, 1);
  await service.send({ id: 2, method: 'item/permissions/requestApproval', params: { permissions } }, 'decline');
  assert.deepEqual(calls[1], { scope: 'turn', permissions: {} });
  const answers = { q: { answers: ['Choice'] } };
  await service.send({ id: 3, method: 'item/tool/requestUserInput' }, 'accept', answers);
  answers.q.answers.push('Changed'); assert.deepEqual(calls[2], { answers: { q: { answers: ['Choice'] } } });
  await service.send({ id: 4, method: 'item/tool/requestUserInput', params: { questions: [{ id: 'q' }] } }, 'cancel');
  assert.deepEqual(calls[3], { answers: { q: { answers: [] } } });
  await service.send({ id: 5, method: 'mcpServer/elicitation/request' }, 'cancel', undefined, { secret: 'excluded' });
  assert.deepEqual(calls[4], { action: 'cancel', content: null });
});
test('invalid ID never reaches transport; synchronous errors release the request', async () => {
  let calls = 0;
  const service = createServerResponses(() => { calls++; throw Error('offline'); });
  for (const id of [undefined, null, {}, '', NaN, 1.5]) await assert.rejects(service.send({ id }, 'decline'), /编号无效/);
  assert.equal(calls, 0);
  for (let i = 0; i < 2; i++) await assert.rejects(service.send({ id: 0 }, 'decline'), /offline/);
  assert.equal(calls, 2);
});
