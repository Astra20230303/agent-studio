const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resourceTemplateVariables, expandResourceTemplate } = require('../src/mcpResourceTemplate.ts');
test('template parameters deduplicate and expand RFC 6570 scalar expressions', () => {
  assert.deepEqual(resourceTemplateVariables('fixture://{id}/{id:3}{?q,page}{#fragment}'), ['id', 'q', 'page', 'fragment']);
  assert.equal(expandResourceTemplate('fixture://notes/{id}{?q,page}', { id: 'a/b 中文', q: 'a&b', page: '' }), 'fixture://notes/a%2Fb%20%E4%B8%AD%E6%96%87?q=a%26b');
  assert.equal(expandResourceTemplate('{+path}{#fragment}', { path: '/a/b', fragment: 'a b' }), '/a/b#a%20b');
  assert.equal(expandResourceTemplate('{.x}{/x}{;x}{?x}{&x}', { x: 'a b' }), '.a%20b/a%20b;x=a%20b?x=a%20b&x=a%20b');
  assert.equal(expandResourceTemplate('{x:3}/{x*}', { x: 'abcdef' }), 'abc/abcdef');
  assert.equal(expandResourceTemplate('fixture://readme', {}), 'fixture://readme');
});
test('malformed expressions fail and prototype properties never become parameters', () => {
  for (const value of ['', '{', '}', '{x', '{x:0}', '{x:10000}', '{=x}', '{?}', '{x,,y}', '{{x}}']) assert.throws(() => resourceTemplateVariables(value), /模板格式无效/);
  assert.equal(expandResourceTemplate('fixture://x{?constructor,toString,__proto__}', {}), 'fixture://x');
  assert.equal(expandResourceTemplate('{constructor}', { constructor: 'safe' }), 'safe');
});

test('composite values preserve reserved data and expand according to operator', () => {
  const { parseResourceTemplateValue: parse } = require('../src/mcpResourceTemplate.ts');
  const tags = parse('["a/b","中文"]', 'array');
  const filters = parse('{"q":"a&b","page":"2"}', 'object');
  assert.equal(expandResourceTemplate('fixture://x{/tags*}{?filters*}', { tags, filters }), 'fixture://x/a%2Fb/%E4%B8%AD%E6%96%87?q=a%26b&page=2');
  assert.equal(expandResourceTemplate('{?tags*}', { tags }), '?tags=a%2Fb&tags=%E4%B8%AD%E6%96%87');
  assert.equal(expandResourceTemplate('{tags}/{filters}', { tags, filters }), 'a%2Fb,%E4%B8%AD%E6%96%87/q,a%26b,page,2');
  assert.equal(expandResourceTemplate('fixture://x{?tags*,filters*}', { tags: [], filters: {} }), 'fixture://x');
  assert.equal(parse('', 'array'), '');
  assert.deepEqual(parse('{"__proto__":"literal"}', 'object'), JSON.parse('{"__proto__":"literal"}'));
  for (const [input, kind] of [['[', 'array'], ['{}', 'array'], ['[1]', 'array'], ['null', 'object'], ['[]', 'object'], ['{"a":{}}', 'object']]) assert.throws(() => parse(input, kind), /JSON/);
  assert.throws(() => expandResourceTemplate('{tags:2}', { tags }), /只能填写文本/);
  assert.throws(() => expandResourceTemplate('{filters:2}', { filters }), /只能填写文本/);
});
