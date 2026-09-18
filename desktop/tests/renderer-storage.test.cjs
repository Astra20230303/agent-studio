const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { RendererStorage, KEYS, QUEUE_KEY } = require('../electron/renderer-storage.cjs');
const key = 'felix-thread-drafts-v1';
const value = text => JSON.stringify({ new: text });

test('invalid late legacy record leaves earlier records unwritten and retry imports repaired data', async t => {
  const { root, store } = fixture(t);
  const entries = { [key]: value('preserved draft'), [QUEUE_KEY]: '[null]' };
  await assert.rejects(store.importLegacy(entries), /无法迁移 felix-turn-queue-v1/);
  assert.equal(store.read().values[key], null);
  assert.deepEqual(fs.readdirSync(root), []);
  assert.equal(entries[key], value('preserved draft'));
  entries[QUEUE_KEY] = '[]';
  await store.importLegacy(entries);
  assert.equal(new RendererStorage(root).read().values[key], value('preserved draft'));
});

test('invalid obsolete browser record cannot block an existing native record', async t => {
  const { store } = fixture(t);
  await store.write(key, value('native'));
  await store.importLegacy({ [key]: 'broken', [QUEUE_KEY]: '[]' });
  assert.equal(store.read().values[key], value('native'));
  assert.equal(store.read().values[QUEUE_KEY], '[]');
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-storage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, store: new RendererStorage(root) };
}

test('legacy import preserves native values and creates restartable files', async t => {
  const { root, store } = fixture(t);
  await store.importLegacy({ [key]: value('legacy'), [QUEUE_KEY]: '[]' });
  await store.write(key, value('native'));
  await store.importLegacy({ [key]: value('stale legacy') });
  const restored = new RendererStorage(root).read();
  assert.equal(restored.values[key], value('native'));
  assert.equal(restored.values[QUEUE_KEY], '[]');
  assert.deepEqual(restored.recovered, []);
});

test('overlapping writes and flush retain the newest value, including no-op writes', async t => {
  const { root, store } = fixture(t);
  await store.write(key, value('start'));
  const writes = [store.write(key, value('start')), ...Array.from({ length: 80 }, (_, i) => store.write(key, value(String(i))))];
  await store.flush(); await Promise.all(writes);
  await store.write(key, value('79'));
  await store.write(key, value('after no-op'));
  assert.equal(new RendererStorage(root).read().values[key], value('after no-op'));
  assert.ok(fs.readdirSync(root).every(file => !file.endsWith('.tmp')));
});

test('corrupt primary recovers the previous valid backup and repairs on next write', async t => {
  const { root, store } = fixture(t);
  await store.write(key, value('previous'));
  await store.write(key, value('latest'));
  fs.writeFileSync(store.file(key), '{broken');
  const recovered = new RendererStorage(root);
  assert.equal(recovered.read().values[key], value('previous'));
  assert.deepEqual(recovered.read().recovered, [key]);
  await recovered.write(key, value('previous'));
  assert.deepEqual(new RendererStorage(root).read().recovered, []);
});

test('unreadable data blocks all writes rather than replacing it with defaults', async t => {
  const { root, store } = fixture(t);
  fs.writeFileSync(store.file(key), '{broken');
  assert.throws(() => store.read(), /无法读取/);
  await assert.rejects(store.write(KEYS[2], '{}'), /无法读取/);
  assert.equal(fs.readFileSync(store.file(key), 'utf8'), '{broken');
  assert.equal(fs.existsSync(store.file(KEYS[2])), false);
  fs.unlinkSync(store.file(key));
  assert.equal(new RendererStorage(root).read().values[key], null);
});

test('failed replacement retains the previous backup and rejects acknowledgement', async t => {
  const { root, store } = fixture(t);
  await store.write(key, value('kept'));
  fs.unlinkSync(store.file(key)); fs.mkdirSync(store.file(key));
  await assert.rejects(store.write(key, value('not saved')));
  assert.equal(store.read().values[key], value('kept'));
  assert.equal(new RendererStorage(root).read().values[key], value('kept'));
});

test('queue acknowledgement is synchronous and invalid keys or records cannot be persisted', async t => {
  const { root, store } = fixture(t);
  store.writeQueue('[]');
  assert.equal(new RendererStorage(root).read().values[QUEUE_KEY], '[]');
  await assert.rejects(store.write('../escape', '{}'), /Unknown storage key/);
  await assert.rejects(store.write(key, '[]'), /Invalid storage data/);
  await assert.rejects(store.write(KEYS[0], '{"threads":[null],"projects":[]}'), /Invalid conversation data/);
  await assert.rejects(store.write(key, '{"new":123}'), /Invalid draft data/);
  assert.throws(() => store.writeQueue('[null]'), /Invalid queue data/);
  await assert.rejects(store.write(QUEUE_KEY, '[]'), /synchronous/);
});
