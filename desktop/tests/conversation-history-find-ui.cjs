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
      window.__pages = []; window.__fail = false;
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/items/list') {
          window.__pages.push(params);
          if (window.__hold) await new Promise(resolve => { window.__release = resolve; });
          if (window.__fail) return { ok: false, error: 'History offline' };
          if (window.__invalid && params.cursor) return { ok: true, result: { data: [{ item: { type: 'agentMessage', text: 'Missing ID' } }], nextCursor: null } };
          return { ok: true, result: params.cursor ? { data: [{ item: { type: 'agentMessage', id: 'old-reply', text: 'Historical discovery' } }], nextCursor: null } : { data: [{ item: { type: 'userMessage', id: 'old-user', content: [{ type: 'text', text: 'Earlier question' }] } }], nextCursor: 'next' } };
        }
        return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } };
      }, onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '会话内查找', exact: true }).waitFor();
    await page.keyboard.press('Control+f');
    const input = page.getByRole('searchbox', { name: '查找会话内容' });
    await input.fill('needle');
    await page.getByRole('button', { name: '加载完整历史', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '历史已加载' }).waitFor();
    await input.fill('Historical discovery');
    await page.getByRole('status').filter({ hasText: '1 / 1 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'live-old-reply');
    assert.deepEqual(await page.evaluate(() => window.__pages.map(p => p.cursor)), [undefined, 'next']);
    await page.evaluate(() => { window.__fail = true; });
    await page.getByRole('button', { name: '加载完整历史', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '加载失败：History offline' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'live-old-reply');
    console.log('PASS: paginated historical records become searchable and failed reload preserves transcript');
    await page.evaluate(() => { window.__fail = false; window.__invalid = true; });
    await page.getByRole('button', { name: '加载完整历史', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '服务端历史条目无效，已有消息已保留' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'live-old-reply');
    await page.evaluate(() => { window.__invalid = false; window.__pages = []; });
    await page.evaluate(() => { window.__fail = false; window.__hold = true; });
    await page.getByRole('button', { name: '加载完整历史', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.__release));
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.evaluate(() => { window.__hold = false; window.__release(); });
    await page.waitForFunction(() => window.__pages.length === 2);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id !== 'a').messages.length), 0);
    assert.equal(await page.getByText('Historical discovery', { exact: true }).count(), 0);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
