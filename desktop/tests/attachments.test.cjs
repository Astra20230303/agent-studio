const test = require('node:test');
const assert = require('node:assert/strict');
const { userInput } = require('../src/attachments.ts');
test('images are multimodal inputs and other files are explicit quoted references', () => {
  const input = userInput('', [], ['D:/照片.PNG', 'D:/a\nb.txt', 'D:/照片.PNG']);
  assert.deepEqual(input[0], { type: 'localImage', path: 'D:/照片.PNG' });
  assert.equal(input.length, 2);
  assert.ok(input[1].text.endsWith(JSON.stringify('D:/a\nb.txt')));
});
test('text, image and plugin inputs coexist without substituting image paths for pixels', () => {
  const input = userInput('inspect', [{ id: 'plug', name: 'Plugin' }], ['D:/a.webp']);
  assert.deepEqual(input.map(item => item.type), ['text', 'localImage', 'mention']);
});
