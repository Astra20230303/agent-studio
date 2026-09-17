const test = require('node:test');
const assert = require('node:assert/strict');
const { listMiniMaxModels } = require('../electron/minimax-models.cjs');
test('keyless local catalog omits authorization while remote requires a key', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:11434/v1/models');
    assert.equal(options.headers.authorization, undefined);
    return { ok: true, json: async () => ({ data: [{ id: 'local-model' }] }) };
  };
  assert.deepEqual(await listMiniMaxModels({ baseUrl: 'http://127.0.0.1:11434/v1', fetchImpl }), { ok: true, models: ['local-model'] });
  const remote = await listMiniMaxModels({ baseUrl: 'https://example.com/v1', fetchImpl });
  assert.equal(remote.ok, false); assert.equal(calls, 1);
});
