const test = require('node:test');
const assert = require('node:assert/strict');
const { providerUrl } = require('../electron/provider-url.cjs');
test('supports local HTTP and remote HTTPS provider endpoints', () => {
  for (const host of ['localhost', '127.0.0.1', '127.0.0.2', '[::1]']) assert.equal(providerUrl(`http://${host}:11434/v1/`), `http://${host}:11434/v1`);
  assert.equal(providerUrl('https://example.com/v1/'), 'https://example.com/v1');
  for (const url of ['http://example.com', 'http://localhost.example.com', 'http://192.168.1.1', 'http://user:pass@localhost', 'http://localhost/?key=secret', 'http://localhost/#fragment', 'file:///tmp/model', 'invalid']) assert.throws(() => providerUrl(url));
});
