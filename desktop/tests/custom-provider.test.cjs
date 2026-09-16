const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listMiniMaxModels } = require('../electron/minimax-models.cjs');

test('custom provider preserves port and v1 path and sends bearer authentication', async () => {
  const result = await listMiniMaxModels({
    baseUrl: 'https://api.rvcompute.com:60000/v1/',
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.rvcompute.com:60000/v1/models');
      assert.equal(options.headers.authorization, 'Bearer test-key');
      return new Response(JSON.stringify({ data: [{ id: 'custom-model' }] }));
    },
  });
  assert.deepEqual(result, { ok: true, models: ['custom-model'] });
});
