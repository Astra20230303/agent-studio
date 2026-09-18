const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

function validateJpeg(data) {
  if (data.length > 16 * 1024 * 1024) throw Error('JPEG 超过 16 MB，请缩小图片');
  const decoded = jpeg.decode(data, { useTArray: true, formatAsRGBA: false, tolerantDecoding: false, maxResolutionInMP: 16, maxMemoryUsageInMB: 128 });
  if (!decoded.width || !decoded.height) throw Error('JPEG 格式无效');
}

function validatePng(data) {
  if (data.length > 16 * 1024 * 1024) throw Error('PNG 超过 16 MB，请缩小图片');
  if (data.length < 24 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw Error('PNG 格式无效');
  if (data.readUInt32BE(16) * data.readUInt32BE(20) > 16 * 1024 * 1024) throw Error('PNG 像素过多，请缩小图片');
  PNG.sync.read(data, { checkCRC: true });
}

async function validateWebImage(data, format) {
  // GIF decoders may normalize the logical screen to the first frame's extent.
  if (format === 'gif') {
    if (data.length < 10 || !/^GIF8[79]a$/.test(data.toString('ascii', 0, 6))) throw Error('GIF 格式无效');
    const width = data.readUInt16LE(6), height = data.readUInt16LE(8);
    if (!width || !height || width * height > 16 * 1024 * 1024) throw Error('GIF 画布像素过多或无效，请缩小图片');
  }
  const sharp = require('sharp');
  sharp.cache(false); sharp.concurrency(1);
  const image = sharp(data, { failOn: 'warning', limitInputPixels: 16 * 1024 * 1024, pages: 1 });
  const metadata = await image.metadata();
  if (metadata.format !== format) throw Error(`${format.toUpperCase()} 格式无效`);
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 16 * 1024 * 1024) throw Error('图片像素过多或无效，请缩小图片');
  await image.timeout({ seconds: 10 }).raw().toBuffer();
}

async function validateImageInputs(method, params) {
  if (!['turn/start', 'turn/steer'].includes(method) || !Array.isArray(params?.input)) return;
  for (const item of params.input) {
    if (item?.type !== 'localImage') continue;
    const filename = item.path;
    if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw Error('图片附件路径无效');
    let handle;
    try {
      handle = await fs.open(filename, 'r');
      const stat = await handle.stat();
      if (!stat.isFile()) throw Error('不是文件');
      const isPng = /\.png$/i.test(filename);
      const isJpeg = /\.jpe?g$/i.test(filename);
      const format = /\.webp$/i.test(filename) ? 'webp' : /\.gif$/i.test(filename) ? 'gif' : undefined;
      if (!isPng && !isJpeg && !format) continue;
      const limit = 16 * 1024 * 1024;
      if (stat.size > limit) throw Error('图片超过 16 MB，请缩小图片');
      const buffer = Buffer.alloc(Math.min(stat.size + 1, limit + 1));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > stat.size) throw Error('图片已变化，请重新选择');
      const data = buffer.subarray(0, bytesRead);
      if (isPng) validatePng(data);
      else if (isJpeg) validateJpeg(data);
      else await validateWebImage(data, format);
    } catch (error) {
      throw Error(`图片附件无法读取或解码：${path.basename(filename)}。${error.message}`);
    } finally { await handle?.close(); }
  }
}

module.exports = { validateImageInputs, validatePng, validateJpeg, validateWebImage };
