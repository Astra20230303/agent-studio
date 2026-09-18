const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ThreadProviderRouter } = require('../electron/thread-provider-router.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-migration-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const router = new ThreadProviderRouter(path.join(directory, 'bindings.json'), id => ({ id, baseUrl: 'http://localhost:1234' }), () => 'http://localhost:5678');
  router.save('thread', 'a');
  const calls = [];
  const rpc = { request: async (method, params) => {
    calls.push({ method, params });
    if (method === 'thread/read') return { thread: { status: { type: 'idle' } } };
    if (method === 'thread/resume') return { thread: { id: 'thread' }, model: params.model || 'model-a', modelProvider: params.modelProvider };
    return {};
  } };
  return { router, rpc, calls };
}
const change = (router, rpc) => router.request(rpc, 'felix/thread/provider', { threadId: 'thread', providerId: 'b', model: 'model-b' });

test('active engine thread refuses migration without unsubscribing', async t => {
  const { router, rpc } = fixture(t);
  rpc.request = async method => { assert.equal(method, 'thread/read'); return { thread: { status: { type: 'active' } } }; };
  await assert.rejects(change(router, rpc), /正在运行/);
  assert.equal(router.get('thread'), 'a');
});

test('migration blocks concurrent turn and duplicate migration until confirmed', async t => {
  const { router, rpc } = fixture(t);
  const original = rpc.request;
  let release;
  rpc.request = (method, params) => method === 'thread/read' ? new Promise(resolve => { release = resolve; }) : original(method, params);
  const changing = change(router, rpc);
  await assert.rejects(router.request(rpc, 'turn/start', { threadId: 'thread' }), /正在切换/);
  await assert.rejects(change(router, rpc), /尚未完成/);
  release({ thread: { status: { type: 'idle' } } });
  await changing;
  assert.equal(router.get('thread'), 'b');
});

test('ignored override restores original engine and leaves binding unchanged', async t => {
  const { router, rpc, calls } = fixture(t);
  const original = rpc.request;
  rpc.request = async (method, params) => {
    const result = await original(method, params);
    return method === 'thread/resume' ? { ...result, modelProvider: 'minimax' } : result;
  };
  await assert.rejects(change(router, rpc), /未应用目标渠道/);
  assert.equal(router.get('thread'), 'a');
  assert.equal(calls.filter(call => call.method === 'thread/unsubscribe').length, 2);
  assert.equal(calls.at(-1).params.config['model_providers.minimax.base_url'], 'http://localhost:5678/providers/a/v1');
  assert.equal(calls.at(-1).params.model, 'model-a');
  await router.request(rpc, 'turn/start', { threadId: 'thread' });
});

test('binding write failure rolls back engine; failed rollback blocks further requests until a new process', async t => {
  const { router, rpc } = fixture(t);
  const original = rpc.request;
  router.save = () => { throw Error('Disk full'); };
  rpc.request = async (method, params) => {
    if (method === 'thread/resume' && params.modelProvider === 'minimax' && params.model) throw Error('Restore failed');
    return original(method, params);
  };
  await assert.rejects(change(router, rpc), /Disk full.*Restore failed/);
  assert.equal(router.get('thread'), 'a');
  await assert.rejects(router.request(rpc, 'turn/start', { threadId: 'thread' }), /状态未确认/);
  await router.request({ request: original }, 'turn/start', { threadId: 'thread' });
});

test('binding write failure restores the original model as well as the Provider', async t => {
  const { router, rpc, calls } = fixture(t);
  router.save = () => { throw Error('Disk full'); };
  await assert.rejects(change(router, rpc), /Disk full/);
  assert.equal(router.get('thread'), 'a');
  assert.equal(calls.at(-1).params.model, 'model-a');
  assert.equal(calls.at(-1).params.modelProvider, 'minimax');
  await router.request(rpc, 'turn/start', { threadId: 'thread' });
});

test('pending thread operations prevent migration without blocking another thread', async t => {
  const { router, rpc } = fixture(t);
  const original = rpc.request;
  let release;
  rpc.request = (method, params) => method === 'turn/start' && params.threadId === 'thread'
    ? new Promise(resolve => { release = resolve; }) : original(method, params);
  const sending = router.request(rpc, 'turn/start', { threadId: 'thread' });
  await assert.rejects(change(router, rpc), /尚未完成/);
  await router.request(rpc, 'thread/read', { threadId: 'other' });
  release({ turn: { id: 'turn' } });
  await sending;
  await change(router, rpc);
  assert.equal(router.get('thread'), 'b');
});
