const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');
const { savePastedImage } = require('../electron/pasted-image.cjs');
const sharp = require('sharp');
for (const [format, extension] of [['png', 'png'], ['jpeg', 'jpg'], ['webp', 'webp'], ['gif', 'gif']]) {
  test(`clipboard ${format} preserves encoded bytes and rejects truncated content before writing`, async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-paste-format-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const data = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#e03250' } }).toFormat(format).toBuffer();
    await assert.rejects(savePastedImage(root, data.subarray(0, 16)));
    assert.deepEqual(await fs.readdir(root), []);
    // Exercise typed-array views, as IPC callers need not own an entire buffer.
    const padded = Buffer.concat([Buffer.from('prefix'), data, Buffer.from('suffix')]);
    const saved = await savePastedImage(root, new Uint8Array(padded.buffer, padded.byteOffset + 6, data.length));
    assert.equal(path.extname(saved), `.${extension}`);
    assert.deepEqual(await fs.readFile(saved), data);
  });
}
test('clipboard PNG storage validates bytes and preserves independent files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-paste-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(savePastedImage(root, 'not bytes'), /无效/);
  await assert.rejects(savePastedImage(root, new Uint8Array([1, 2])), /无效/);
  assert.deepEqual(await fs.readdir(root), []);
  const png = new PNG({ width: 2, height: 2 }); png.data.fill(255);
  const data = PNG.sync.write(png);
  const first = await savePastedImage(root, data), second = await savePastedImage(root, data);
  assert.notEqual(first, second);
  assert.equal(path.dirname(first), path.join(root, 'attachments'));
  assert.deepEqual(await fs.readFile(first), data);
});
