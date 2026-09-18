const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { PNG } = require('pngjs');
const { ImageProcessing } = require('../electron/image-processing.cjs');

async function fixture(t, options = {}) {
  const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-image-worker-'));
  const service = new ImageProcessing({ dataRoot, ...options });
  t.after(async () => { await service.close(); await fs.rm(dataRoot, { recursive: true, force: true }); });
  return { service, dataRoot };
}
const validate = (service, file) => service.validate('turn/start', { input: [{ type: 'localImage', path: file }] });
const workerFile = path.join(__dirname, 'fixtures/image-worker-control.cjs');

test('clipboard formats survive worker transfer and attachment preflight unchanged', async t => {
  const { service, dataRoot } = await fixture(t);
  const sharp = require('sharp');
  for (const [format, extension] of [['jpeg', '.jpg'], ['webp', '.webp'], ['gif', '.gif']]) {
    const data = await sharp({ create: { width: 7, height: 5, channels: 3, background: '#2080b0' } }).toFormat(format).toBuffer();
    await assert.rejects(service.savePaste(data.subarray(0, 16)));
    const saved = await service.savePaste(data);
    assert.equal(path.extname(saved), extension);
    assert.deepEqual(await fs.readFile(saved), data);
    await validate(service, saved);
  }
  await assert.rejects(service.savePaste(Buffer.alloc(16 * 1024 * 1024 + 1)), /16 MB/);
  await assert.rejects(service.savePaste(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), /格式无效/);
  assert.equal((await fs.readdir(path.join(dataRoot, 'attachments'))).length, 3);
});

test('production worker validates files and saves clipboard bytes without bypassing decoder errors', async t => {
  const { service, dataRoot } = await fixture(t);
  const file = path.join(dataRoot, 'invalid.jpg'); await fs.writeFile(file, 'not an image');
  await assert.rejects(validate(service, file), /invalid.jpg/);
  const png = new PNG({ width: 8, height: 8 }); png.data.fill(255);
  const data = PNG.sync.write(png);
  const saved = await service.savePaste(data);
  assert.equal(path.dirname(saved), path.join(dataRoot, 'attachments'));
  assert.deepEqual(await fs.readFile(saved), data);
  await validate(service, saved);
  await service.validate('turn/steer', { input: [{ type: 'localImage', path: saved }] });
  await assert.rejects(service.savePaste(Buffer.from('bad')), /PNG/);
  await service.validate('thread/start', { input: [{ type: 'localImage', path: 'not a path' }] });
});

test('hung worker leaves event loop responsive, enforces queue bound and recovers after timeout', async t => {
  const { service } = await fixture(t, { workerFile, timeoutMs: 500, maxPending: 2 });
  const first = assert.rejects(validate(service, 'hang'), /超时/);
  const second = validate(service, 'ok');
  await assert.rejects(validate(service, 'overflow'), /任务过多/);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(service.active, 'parent event loop still runs while worker is blocked');
  await first; await second;
  await validate(service, 'ok');
});

test('unexpected worker exit rejects only its task and permits later validation', async t => {
  const { service } = await fixture(t, { workerFile });
  await assert.rejects(validate(service, 'crash'), /异常退出/);
  await validate(service, 'ok');
});

test('closing terminates active work and rejects queued and future jobs', async t => {
  const { service } = await fixture(t, { workerFile });
  const first = assert.rejects(validate(service, 'hang'), /取消/);
  const second = assert.rejects(validate(service, 'ok'), /取消/);
  await service.close(); await Promise.all([first, second]);
  assert.equal(service.active, undefined);
  await assert.rejects(validate(service, 'ok'), /已关闭/);
});
