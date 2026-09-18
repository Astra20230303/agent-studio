const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('node:module').stripTypeScriptTypes;

function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/attachments.ts'), 'utf8');
  const compiled = ts(source).replace(/export function /g, 'function ') + '\nmodule.exports = { attachmentInput, userInput };';
  const module = { exports: {} };
  new Function('module', 'exports', compiled)(module, module.exports);
  return module.exports;
}

test('attachment input preserves unique paths and uses model-compatible image/text records', () => {
  const { attachmentInput, userInput } = load();
  assert.deepEqual(attachmentInput(['D:/image.PNG', 'D:/notes.txt', 'D:/image.PNG']), [
    { type: 'localImage', path: 'D:/image.PNG' },
    { type: 'text', text: '用户附加的本地文件（请按需使用文件工具读取）："D:/notes.txt"' },
  ]);
  assert.deepEqual(userInput('inspect', [{ id: 'p', name: 'Plugin' }], ['D:/image.PNG'], [{ name: 'Review', path: 'D:/SKILL.md' }]), [
    { type: 'text', text: 'inspect' },
    { type: 'localImage', path: 'D:/image.PNG' },
    { type: 'mention', name: 'Plugin', path: 'plugin://p' },
    { type: 'skill', name: 'Review', path: 'D:/SKILL.md' },
  ]);
});

test('attachment input keeps non-image files as literal paths instead of reading them in the renderer', () => {
  const { attachmentInput } = load();
  const [record] = attachmentInput(['D:/report.pdf?x=1']);
  assert.equal(record.type, 'text');
  assert.match(record.text, /D:\/report\.pdf\?x=1/);
  assert.equal(record.text.includes('javascript:'), false);
});
