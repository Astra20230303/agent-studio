const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toolMedia, resultBlocks } = require('../src/toolMedia.ts');
test('MCP and dynamic media support bounded raster and audio data', () => {
  assert.equal(toolMedia({ type: 'image', mimeType: 'image/png', data: 'YQ==' }).src, 'data:image/png;base64,YQ==');
  assert.equal(toolMedia({ type: 'inputAudio', audioUrl: 'data:audio/wav;base64,YQ==' }).kind, 'audio');
  assert.equal(toolMedia({ type: 'inputImage', imageUrl: 'https://example.com/a.png' }).kind, 'image');
  for (const imageUrl of ['file:///a', 'javascript:alert(1)', 'data:image/svg+xml;base64,YQ==', 'https://user:secret@example.com/a']) assert.equal(toolMedia({ type: 'inputImage', imageUrl }), undefined);
  assert.equal(toolMedia({ type: 'image', mimeType: 'image/png', data: 'a'.repeat(15 * 1024 * 1024) }), undefined);
});
test('result blocks preserve both protocol envelopes', () => {
  const blocks = [{ type: 'text', text: 'result' }];
  assert.deepEqual(resultBlocks(blocks), blocks); assert.deepEqual(resultBlocks({ content: blocks }), blocks); assert.deepEqual(resultBlocks(null), []);
});
