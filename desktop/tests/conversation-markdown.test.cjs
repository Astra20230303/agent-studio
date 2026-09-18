const test = require('node:test');
const assert = require('node:assert/strict');
const { conversationMarkdown } = require('../src/conversationMarkdown.ts');
test('malformed history cannot prevent exporting valid text and unknown records', () => {
  const output = conversationMarkdown({ id: 't', title: 'Test', messages: [] }, [
    null, undefined, 42, { item: null },
    { type: 'userMessage', content: {} },
    { type: 'userMessage', content: [null, undefined, { type: 'text', text: { detail: 'preserved' } }, { type: 'text', text: 'valid' }] },
    { type: 'agentMessage', text: { detail: 'unexpected' } },
    { type: 'futureRecord', payload: '```literal```' },
    { type: 'agentMessage', text: 'final answer' }
  ]);
  for (const expected of ['preserved', 'valid', 'unexpected', 'futureRecord', '````', 'final answer']) assert.ok(output.includes(expected), expected);
  assert.ok(!output.includes('[object Object]'));
});
