const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'A', messages: [], status: 'completed', updatedAt: '' }, { id: 'b', remoteId: 'remote-b', title: 'B', archived: true, messages: [], status: 'completed', updatedAt: '' }] }));
      window.__calls = []; window.__listeners = new Set();
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), onOpenConversation: fn => { window.__listeners.add(fn); return () => window.__listeners.delete(fn); } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [{ id: 't', items: [{ id: params.threadId, type: 'agentMessage', text: `Reply from ${params.threadId}` }] }] } } : { data: [] } }; }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByText('Reply from remote-a', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('keep A draft');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.evaluate(() => window.__listeners.forEach(fn => fn('remote-b')));
    await page.getByText('Reply from remote-b', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id === 'b').archived), true);
    for (let i = 0; i < 2; i++) await page.evaluate(() => window.__listeners.forEach(fn => fn('remote-new')));
    await page.getByText('Reply from remote-new', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.filter(t => t.remoteId === 'remote-new').length), 1);
    await page.evaluate(() => window.__listeners.forEach(fn => fn('remote-a')));
    await page.getByText('Reply from remote-a', { exact: true }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), 'keep A draft');
    assert.equal(await page.evaluate(() => window.__listeners.size), 1);
    console.log('PASS: notification navigation restores correct thread, preserves draft/archive state and deduplicates new records');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
