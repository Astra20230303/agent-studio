const fs = require('node:fs/promises');
const path = require('node:path');
async function saveConversation(input, chooseFile) {
  try {
    if (typeof input?.filename !== 'string' || typeof input?.content !== 'string') throw new Error('无效的导出内容');
    const result = await chooseFile({ title: '导出会话', defaultPath: path.basename(input.filename), filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true };
    await fs.writeFile(result.filePath, input.content, 'utf8');
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
}
module.exports = { saveConversation };
async function saveTerminal(input, chooseFile) {
  try {
    if (typeof input?.filename !== 'string' || typeof input?.content !== 'string') throw Error('无效的终端日志');
    const result = await chooseFile({ title: '导出终端缓冲区', defaultPath: path.basename(input.filename), filters: [{ name: 'Text', extensions: ['txt'] }] });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true };
    await fs.writeFile(result.filePath, input.content, 'utf8');
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
}
module.exports.saveTerminal = saveTerminal;
