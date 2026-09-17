const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { saveConversation } = require('../electron/conversation-export.cjs');
test('native export writes UTF-8 to selected path, cancellation leaves file intact, errors surface', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-export-'));
  const filePath = path.join(folder, 'chat.md');
  const content = '# 中文\n\n```\ncode\n```\n';
  assert.deepEqual(await saveConversation({ filename: 'chat.md', content }, async () => ({ filePath })), { ok: true });
  assert.equal(await fs.readFile(filePath, 'utf8'), content);
  assert.deepEqual(await saveConversation({ filename: 'chat.md', content: 'overwrite' }, async () => ({ canceled: true, filePath })), { ok: true, canceled: true });
  assert.equal(await fs.readFile(filePath, 'utf8'), content);
  assert.equal((await saveConversation({ filename: 'chat.md', content }, async () => ({ filePath: folder }))).ok, false);
  assert.equal((await saveConversation({}, async () => { throw Error('should not open'); })).ok, false);
});
