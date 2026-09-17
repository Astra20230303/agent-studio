const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const messages = [
        { id: 'user', role: 'user', content: 'Needle question', attachments: ['D:/attachment.txt'] },
        { id: 'tool', role: 'assistant', content: '', tool: { kind: 'commandExecution', status: 'completed', command: 'test', output: 'needle output' } },
        { id: 'reply', role: 'assistant', content: 'NEEDLE answer' },
      ];
      for (let i = 0; i < 30; i++) messages.push({ id: `filler-${i}`, role: 'assistant', content: `Filler paragraph ${i}\n\nMore content for scroll testing.` });
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Search conversation', messages, status: 'completed', updatedAt: '' }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => ({ ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } }), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '会话内查找', exact: true }).waitFor();
    await page.keyboard.press('Control+f');
    const input = page.getByRole('searchbox', { name: '查找会话内容' });
    await input.fill('needle');
    const latest = page.getByRole('button', { name: '↓ 回到最新消息', exact: true });
    await latest.click();
    await input.waitFor({ state: 'detached' });
    await latest.waitFor({ state: 'detached' });
    await page.waitForFunction(() => { const v = document.querySelector('.thread-view'); return v.scrollHeight - v.scrollTop - v.clientHeight < 5; });
    await page.evaluate(() => window.__notify({ method: 'item/agentMessage/delta', params: { threadId: 'remote-a', itemId: 'latest-test', delta: 'Latest new reply\n\n'.repeat(15) } }));
    await page.waitForFunction(() => { const view = document.querySelector('.thread-view'); return view.scrollHeight - view.scrollTop - view.clientHeight < 5; });
    await page.locator('.thread-view').evaluate(element => { element.scrollTop = 0; });
    await latest.waitFor();
    await page.evaluate(() => window.__notify({ method: 'item/agentMessage/delta', params: { threadId: 'remote-a', itemId: 'latest-test', delta: '\nMore incoming content' } }));
    await page.waitForFunction(() => document.querySelector('.thread-view').scrollTop === 0);
    await latest.click();
    await page.waitForFunction(() => { const view = document.querySelector('.thread-view'); return view.scrollHeight - view.scrollTop - view.clientHeight < 5; });
    await page.getByRole('button', { name: '会话内查找', exact: true }).click();
    await input.fill('needle');
    await page.getByRole('status').filter({ hasText: '1 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'user');
    await input.press('Enter');
    await page.getByRole('status').filter({ hasText: '2 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'tool');
    assert.equal(await page.locator('[data-message-id="tool"] details').getAttribute('open'), '');
    const scrollBefore = await page.locator('.thread-view').evaluate(element => element.scrollTop);
    await page.evaluate(() => window.__notify({ method: 'item/agentMessage/delta', params: { threadId: 'remote-a', itemId: 'streaming', delta: 'Incoming reply during search' } }));
    await page.getByText('Incoming reply during search', { exact: true }).waitFor();
    assert.equal(await page.locator('.thread-view').evaluate(element => element.scrollTop), scrollBefore);
    await input.press('Shift+Enter');
    await page.getByRole('button', { name: '上一个匹配', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '3 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'reply');
    await input.fill('attachment.txt');
    await page.getByRole('status').filter({ hasText: '1 / 1 条匹配记录' }).waitFor();
    await input.fill('missing-value');
    await page.getByRole('status').filter({ hasText: '没有匹配记录' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '下一个匹配', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.conversation-find-match').count(), 0);
    await input.press('Escape');
    await input.waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: '会话内查找', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.getByRole('button', { name: '会话内查找', exact: true }).click();
    await input.fill('needle');
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await input.waitFor({ state: 'detached' });
    assert.equal(await page.locator('.conversation-find-match').count(), 0);
    console.log('PASS: conversation find matches text/tools/attachments, opens tools, cycles and supports keyboard/no-results/close');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
