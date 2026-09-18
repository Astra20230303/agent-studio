const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { PNG } = require('pngjs');
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
