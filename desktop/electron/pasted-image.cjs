const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { validatePng, validateJpeg, validateWebImage } = require('./attachment-validation.cjs');

async function savePastedImage(dataRoot, bytes) {
  if (!(bytes instanceof Uint8Array)) throw Error('剪贴板图片数据无效');
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (data.length > 16 * 1024 * 1024) throw Error('图片超过 16 MB，请缩小图片');
  let extension;
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    validatePng(data); extension = 'png';
  } else if (data[0] === 0xff && data[1] === 0xd8) {
    validateJpeg(data); extension = 'jpg';
  } else if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    await validateWebImage(data, 'webp'); extension = 'webp';
  } else if (/^GIF8[79]a$/.test(data.toString('ascii', 0, 6))) {
    await validateWebImage(data, 'gif'); extension = 'gif';
  } else throw Error('剪贴板图片格式无效，仅支持 PNG、JPEG、WebP、GIF');
  const directory = path.join(dataRoot, 'attachments');
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, `clipboard-${randomUUID()}.${extension}`);
  try { await fs.writeFile(filename, data, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') await fs.unlink(filename).catch(() => {}); throw error; }
  return filename;
}

module.exports = { savePastedImage };
