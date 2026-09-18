const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { conversationMarkdown } = require('../src/conversationMarkdown.ts');
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

test('export metadata contains safe runtime configuration and excludes secrets', () => {
  const content = conversationMarkdown({ id:'a', title:'T', model:'m', providerId:'p', reasoningEffort:'high', planningMode:'plan', cwd:'D:/repo', requestedPermission:'workspace-write', effectivePermissions:{ sandbox:'workspaceWrite', approvalPolicy:'on-request', reviewer:'auto_review' }, messages:[] });
  for (const value of ['模型：m','Provider：p','推理强度：high','执行模式：先规划','工作目录：D:/repo','实际沙箱：workspaceWrite','审批策略：on-request']) assert.match(content, new RegExp(value));
  assert.doesNotMatch(content, /apiKey|token|secret/i);
});
