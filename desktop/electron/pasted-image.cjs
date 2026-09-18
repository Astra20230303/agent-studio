const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { validatePng } = require('./attachment-validation.cjs');

async function savePastedImage(dataRoot, bytes) {
  if (!(bytes instanceof Uint8Array)) throw Error('剪贴板图片数据无效');
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  validatePng(data);
  const directory = path.join(dataRoot, 'attachments');
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, `clipboard-${randomUUID()}.png`);
  try { await fs.writeFile(filename, data, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') await fs.unlink(filename).catch(() => {}); throw error; }
  return filename;
}

module.exports = { savePastedImage };
