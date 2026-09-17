const { test } = require('node:test');
const assert = require('node:assert/strict');
const { externalUrl } = require('../electron/external-url.cjs');
test('browser links preserve query parameters and reject executable schemes', () => {
  assert.equal(externalUrl('https://example.com/auth?state=abc'), 'https://example.com/auth?state=abc');
  for (const input of ['file:///C:/test', 'javascript:alert(1)', 'cmd:run', 'https://user:password@example.com', 'invalid']) assert.throws(() => externalUrl(input));
});
