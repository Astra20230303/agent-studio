const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   const messages = [
    { id: 'u', role: 'user', content: 'needle question', attachments: ['D:/unique-file.txt'] },
    { id: 't', role: 'assistant', content: '', tool: { kind: 'commandExecution', status: 'completed', command: 'test', output: 'needle output' } },
    { id: 'a', role: 'assistant', content: 'needle reply' },
    { id: 'a2', role: 'assistant', content: 'needle second' },
   ];
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'one', threads: [{ id: 'one', title: 'One', status: 'completed', messages, updatedAt: '' }, { id: 'two', title: 'Two', status: 'completed', messages: [{ id: 'u2', role: 'user', content: 'needle other' }], updatedAt: '' }] }));
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.getByRole('button', { name: '会话内查找', exact: true }).click();
  const input = page.getByRole('searchbox', { name: '查找会话内容' });
  const scope = page.getByRole('combobox', { name: '会话查找范围' });
  const match = page.locator('.conversation-find-match');
  await input.fill('needle');
  await page.getByText('1 / 4 条匹配记录', { exact: true }).waitFor();
  for (const [value, id, count] of [['assistant', 'a', 2], ['tool', 't', 1], ['user', 'u', 1]]) {
   await scope.selectOption(value);
   await page.getByText(`1 / ${count} 条匹配记录`, { exact: true }).waitFor();
   assert.equal(await match.getAttribute('data-message-id'), id);
   if (value === 'tool') assert.equal(await page.locator('[data-message-id=t] details').getAttribute('open'), '');
  }
  await input.fill('unique-file');
  await page.getByText('1 / 1 条匹配记录', { exact: true }).waitFor();
  await scope.selectOption('tool');
  await page.getByText('没有匹配记录', { exact: true }).waitFor();
  assert.equal(await match.count(), 0);
  assert.equal(await page.getByRole('button', { name: '下一个匹配', exact: true }).isDisabled(), true);
  await input.fill('needle'); await scope.selectOption('assistant');
  await input.press('Enter');
  assert.equal(await match.getAttribute('data-message-id'), 'a2');
  await input.press('Escape');
  await page.getByRole('button', { name: '会话内查找', exact: true }).click();
  assert.equal(await scope.inputValue(), 'assistant');
  assert.equal(await input.inputValue(), 'needle');
  await scope.selectOption('all');
  await page.getByText('1 / 4 条匹配记录', { exact: true }).waitFor();
  assert.equal(await match.getAttribute('data-message-id'), 'u');
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await scope.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await scope.selectOption('tool');
  assert.equal(await match.getAttribute('data-message-id'), 't');
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click();
  await page.getByRole('button', { name: 'Two', exact: true }).click();
  await page.getByRole('button', { name: '会话内查找', exact: true }).click();
  assert.equal(await scope.inputValue(), 'all');
  assert.equal(await input.inputValue(), '');
  console.log('PASS: conversation search role scopes, tool expansion, attachment matching, empty results, navigation and thread reset');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
