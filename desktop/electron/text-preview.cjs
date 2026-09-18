const { createHash } = require('node:crypto');
const TEXT_PREVIEW_LIMIT = 256 * 1024;

async function readTextPreview(handle, size) {
  const buffer = Buffer.alloc(Math.min(size + 1, TEXT_PREVIEW_LIMIT + 1));
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
    if (!bytesRead) break;
    total += bytesRead;
  }
  if (total > size || total < Math.min(size, buffer.length)) throw Error('文件正在变化，请刷新后重试');
  const bytes = buffer.subarray(0, Math.min(total, TEXT_PREVIEW_LIMIT));
  if (bytes.includes(0)) return { binary: true, size };
  const truncated = total > TEXT_PREVIEW_LIMIT;
  let encodingInvalid = false;
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: truncated }); }
  catch { encodingInvalid = true; }
  return {
    text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes, { stream: truncated }),
    revision: !truncated && !encodingInvalid ? createHash('sha256').update(bytes).digest('hex') : undefined,
    truncated, encodingInvalid, size, previewBytes: bytes.length,
  };
}
module.exports = { readTextPreview, TEXT_PREVIEW_LIMIT };
