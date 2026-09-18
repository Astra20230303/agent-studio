const test = require('node:test');
const assert = require('node:assert/strict');
const { createAsyncStorage } = require('../src/asyncStorage.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const disk = { a: 'old', b: 'other', 'felix-turn-queue-v1': '[]' };
  const calls = [];
  const bridge = {
    read: async () => ({ ok: true, values: disk }),
    importLegacy: async values => ({ ok: true, values }),
    write: (key, value) => new Promise(resolve => calls.push({ key, value, finish: ok => { if (ok) disk[key] = value; resolve({ ok }); } })),
    writeQueue: value => { disk['felix-turn-queue-v1'] = value; return { ok: true }; },
  };
  const store = createAsyncStorage(() => bridge, () => ({ getItem: () => null, setItem: () => {} }));
  return { store, bridge, disk, calls };
}
test('all writes reach the native owner immediately and late acknowledgements cannot roll back local intent', async () => {
  const { store, calls, disk } = fixture();
  await store.initialize();
  const first = store.setItem('a', 'first');
  const last = store.setItem('a', 'last');
  const other = store.setItem('b', 'parallel');
  await tick();
  assert.deepEqual(calls.map(call => call.value), ['first', 'last', 'parallel']);
  assert.equal(store.getItem('a'), 'last');
  assert.equal(disk.a, 'old');
  calls[2].finish(true); await other;
  calls[0].finish(true); await first;
  assert.equal(store.getItem('a'), 'last');
  calls[1].finish(true); await last;
  assert.equal(disk.a, 'last');
});
test('failed write rejects its caller but queued latest write can recover', async () => {
  const { store, calls, disk } = fixture(); await store.initialize();
  const failure = assert.rejects(store.setItem('a', 'failed'), /保存失败/);
  const next = store.setItem('a', 'recovered');
  await tick(); calls[0].finish(false); await failure; await tick();
  calls[1].finish(true); await next;
  assert.equal(disk.a, 'recovered');
});
test('initialization and queue acknowledgement guard reads and writes', async () => {
  const { store, bridge } = fixture();
  assert.throws(() => store.getItem('a'), /尚未加载/);
  await assert.rejects(store.setItem('a', 'x'), /尚未加载/);
  await store.initialize();
  bridge.writeQueue = () => ({ ok: false });
  assert.throws(() => store.setQueue('[1]'), /队列保存失败/);
  assert.equal(store.getItem('felix-turn-queue-v1'), '[]');
  await assert.rejects(store.setItem('felix-turn-queue-v1', '[1]'), /同步保存/);
});
