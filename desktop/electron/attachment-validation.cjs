const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');

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
      if (!/\.png$/i.test(filename)) continue;
      const limit = 16 * 1024 * 1024;
      if (stat.size > limit) throw Error('PNG 超过 16 MB，请缩小图片');
      const buffer = Buffer.alloc(Math.min(stat.size + 1, limit + 1));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > stat.size) throw Error('图片已变化，请重新选择');
      const data = buffer.subarray(0, bytesRead);
      if (data.length < 24 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw Error('PNG 格式无效');
      if (data.readUInt32BE(16) * data.readUInt32BE(20) > 16 * 1024 * 1024) throw Error('PNG 像素过多，请缩小图片');
      PNG.sync.read(data, { checkCRC: true });
    } catch (error) {
      throw Error(`图片附件无法读取或解码：${path.basename(filename)}。${error.message}`);
    } finally { await handle?.close(); }
  }
}

module.exports = { validateImageInputs };
