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
    if (method === 'thread/resume') return { thread: { id: 'thread' }, modelProvider: params.modelProvider };
    return {};
  } };
  return { router, rpc, calls };
}
const change = (router, rpc) => router.request(rpc, 'felix/thread/provider', { threadId: 'thread', providerId: 'b' });

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
  await router.request(rpc, 'turn/start', { threadId: 'thread' });
});

test('binding write failure rolls back engine; failed rollback blocks further requests until a new process', async t => {
  const { router, rpc } = fixture(t);
  const original = rpc.request;
  router.save = () => { throw Error('Disk full'); };
  rpc.request = async (method, params) => {
    if (method === 'thread/resume' && params.modelProvider === 'minimax') throw Error('Restore failed');
    return original(method, params);
  };
  await assert.rejects(change(router, rpc), /Disk full.*Restore failed/);
  assert.equal(router.get('thread'), 'a');
  await assert.rejects(router.request(rpc, 'turn/start', { threadId: 'thread' }), /状态未确认/);
  await router.request({ request: original }, 'turn/start', { threadId: 'thread' });
});
