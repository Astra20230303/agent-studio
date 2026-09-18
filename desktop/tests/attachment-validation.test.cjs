const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const { validateImageInputs } = require('../electron/attachment-validation.cjs');

test('PNG preflight rejects corrupt and missing images before dispatch, accepts repaired file', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-image-check-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'attachment.png');
  const input = { input: [{ type: 'text', text: 'inspect' }, { type: 'localImage', path: file }] };
  await assert.rejects(validateImageInputs('turn/start', input), /attachment.png/);
  await fs.writeFile(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
  await assert.rejects(validateImageInputs('turn/start', input), /解码/);
  await assert.rejects(validateImageInputs('turn/steer', input), /解码/);
  const png = new PNG({ width: 2, height: 2 }); png.data.fill(255);
  await fs.writeFile(file, PNG.sync.write(png));
  await validateImageInputs('turn/start', input);
  await validateImageInputs('turn/steer', input);
  await validateImageInputs('thread/start', { input: [{ type: 'localImage', path: '../missing' }] });
});

test('WebP/GIF preflight decodes first-frame pixels and rejects corrupt, truncated and oversized files', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-web-image-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sharp = require('sharp');
  for (const format of ['webp', 'gif']) {
    const file = path.join(directory, `image.${format.toUpperCase()}`);
    const valid = await sharp({ create: { width: 16, height: 16, channels: 4, background: '#ff0000' } }).toFormat(format).toBuffer();
    const input = { input: [{ type: 'localImage', path: file }] };
    for (const method of ['turn/start', 'turn/steer']) {
      await fs.writeFile(file, 'not an image');
      await assert.rejects(validateImageInputs(method, input), /解码/);
      await fs.writeFile(file, valid.subarray(0, Math.floor(valid.length / 2)));
      await assert.rejects(validateImageInputs(method, input), /解码/);
      await fs.writeFile(file, valid);
      await validateImageInputs(method, input);
    }
    if (format === 'gif') {
      const huge = Buffer.from(valid); huge.writeUInt16LE(65535, 6); huge.writeUInt16LE(65535, 8);
      await fs.writeFile(file, huge);
      await assert.rejects(validateImageInputs('turn/start', input), /pixel limit|解码/);
    }
    const oversized = await fs.open(file, 'w'); await oversized.truncate(17 * 1024 * 1024); await oversized.close();
    await assert.rejects(validateImageInputs('turn/start', input), /16 MB/);
  }
});

test('JPEG preflight decodes pixels and rejects truncation, corrupt data and excessive dimensions', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-jpeg-check-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'attachment.JPEG');
  const input = { input: [{ type: 'localImage', path: file }] };
  const valid = jpeg.encode({ width: 4, height: 4, data: Buffer.alloc(4 * 4 * 4, 255) }, 90).data;
  for (const method of ['turn/start', 'turn/steer']) {
    await fs.writeFile(file, 'not a JPEG');
    await assert.rejects(validateImageInputs(method, input), /attachment.JPEG.*解码|解码.*attachment.JPEG/);
    await fs.writeFile(file, valid.subarray(0, valid.length - 20));
    await assert.rejects(validateImageInputs(method, input), /解码/);
    await fs.writeFile(file, valid);
    await validateImageInputs(method, input);
  }
  const huge = Buffer.from(valid);
  const frame = huge.indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(frame > 0);
  huge.writeUInt16BE(65535, frame + 5); huge.writeUInt16BE(65535, frame + 7);
  await fs.writeFile(file, huge);
  await assert.rejects(validateImageInputs('turn/start', input), /maxResolutionInMP/);
  huge.writeUInt16BE(4000, frame + 5); huge.writeUInt16BE(4000, frame + 7);
  await fs.writeFile(file, huge);
  await assert.rejects(validateImageInputs('turn/start', input), /maxMemoryUsageInMB/);
  const oversized = await fs.open(file, 'w'); await oversized.truncate(17 * 1024 * 1024); await oversized.close();
  await assert.rejects(validateImageInputs('turn/start', input), /16 MB/);
});

test('animated WebP/GIF accept their first frame, reject mislabeled files and enforce actual WebP pixel limits', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-animation-check-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sharp = require('sharp');
  const pixels = Buffer.alloc(8 * 16 * 3);
  for (let i = 0; i < 8 * 16; i++) pixels[i * 3 + (i < 64 ? 0 : 1)] = 255;
  for (const format of ['webp', 'gif']) {
    const data = await sharp(pixels, { raw: { width: 8, height: 16, channels: 3, pageHeight: 8 } }).toFormat(format, { delay: [100, 100], loop: 0 }).toBuffer();
    assert.equal((await sharp(data, { animated: true }).metadata()).pages, 2);
    const file = path.join(directory, `animated.${format}`);
    await fs.writeFile(file, data);
    await validateImageInputs('turn/start', { input: [{ type: 'localImage', path: file }] });
    const first = await sharp(data, { pages: 1 }).raw().toBuffer({ resolveWithObject: true });
    assert.equal(first.info.height, 8);
    assert.ok(first.data[0] > 240 && first.data[1] < 15);
    await fs.writeFile(file, await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer());
    await assert.rejects(validateImageInputs('turn/start', { input: [{ type: 'localImage', path: file }] }), /格式无效/);
  }
  const huge = path.join(directory, 'large.webp');
  await sharp({ create: { width: 4097, height: 4097, channels: 3, background: '#fff' } }).webp({ lossless: true }).toFile(huge);
  await assert.rejects(validateImageInputs('turn/start', { input: [{ type: 'localImage', path: huge }] }), /pixel limit|像素/);
});
