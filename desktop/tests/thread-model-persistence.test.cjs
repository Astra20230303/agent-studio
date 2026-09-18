const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ThreadProviderRouter } = require('../electron/thread-provider-router.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-model-binding-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'bindings.json');
  const router = new ThreadProviderRouter(file, id => ({ id, baseUrl: 'http://localhost' }), () => 'http://localhost');
  router.save('a', 'provider-a', 'felix_a', 'old');
  router.save('b', 'provider-b', 'felix_b', 'other');
  return { router, file };
}
const event = (threadId = 'a', model = 'new', modelProvider = 'felix_a') => ({ method: 'thread/settings/updated', params: { threadId, threadSettings: { model, modelProvider } } });

test('confirmed model persists only to its original thread without changing Provider', t => {
  const { router, file } = fixture(t);
  assert.equal(router.observe(event()), undefined);
  const bindings = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(bindings.a, { providerId: 'provider-a', modelProvider: 'felix_a', model: 'new' });
  assert.equal(bindings.b.model, 'other');
});

test('malformed, unrelated, unknown and migration notifications do not overwrite bindings', t => {
  const { router, file } = fixture(t);
  const before = fs.readFileSync(file, 'utf8');
  for (const message of [null, {}, { method: 'turn/started' }, event('missing'), event('a', ''), event('a', '  '), event('a', 42), event('a', 'new', 'different')]) router.observe(message);
  router.migrating.add('a'); router.observe(event()); router.migrating.delete('a');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('disk failure warns but retains effective model in memory, and next confirmation retries persistence', t => {
  const { router, file } = fixture(t);
  const save = router.save;
  router.save = () => { throw Error('Disk full'); };
  const warning = router.observe(event());
  assert.equal(warning.method, 'warning');
  assert.equal(warning.params.threadId, 'a');
  assert.match(warning.params.message, /Disk full/);
  assert.equal(router.bindings.a.model, 'new');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).a.model, 'old');
  router.save = save;
  assert.equal(router.observe(event()), undefined);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).a.model, 'new');
});
