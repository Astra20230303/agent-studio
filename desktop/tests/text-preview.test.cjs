const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readTextPreview, TEXT_PREVIEW_LIMIT: limit } = require('../electron/text-preview.cjs');
function handle(data, chunk = Infinity) {
  return { async read(buffer, offset, length, position) {
    const end = Math.min(data.length, position + length, position + chunk);
    return { bytesRead: end > position ? data.copy(buffer, offset, position, end) : 0 };
  } };
}
test('partial reads are accumulated and complete UTF-8 keeps its exact revision', async () => {
  const data = Buffer.from('\ufeff你好\r\nworld');
  const result = await readTextPreview(handle(data, 2), data.length);
  assert.deepEqual(result, { text: data.toString('utf8'), revision: createHash('sha256').update(data).digest('hex'), truncated: false, encodingInvalid: false, size: data.length, previewBytes: data.length });
});
test('truncated multibyte characters are omitted without marking valid UTF-8 invalid', async () => {
  for (const character of ['中', '🙂']) {
    const data = Buffer.from('a'.repeat(limit - 1) + character + 'tail');
    const result = await readTextPreview(handle(data, 997), data.length);
    assert.equal(result.text, 'a'.repeat(limit - 1));
    assert.equal(result.truncated, true);
    assert.equal(result.encodingInvalid, false);
    assert.equal(result.revision, undefined);
  }
});
test('invalid encoding and binary data cannot become editable', async () => {
  const invalid = await readTextPreview(handle(Buffer.from([0x61, 0xff])), 2);
  assert.equal(invalid.encodingInvalid, true); assert.equal(invalid.revision, undefined);
  assert.deepEqual(await readTextPreview(handle(Buffer.from([0, 1])), 2), { binary: true, size: 2 });
});
test('growth and shrinkage detected while reading reject stale size metadata', async () => {
  await assert.rejects(readTextPreview(handle(Buffer.from('longer')), 3), /文件正在变化/);
  await assert.rejects(readTextPreview(handle(Buffer.from('short')), 9), /文件正在变化/);
});
