const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Export test', messages: [{ id: 'local', role: 'user', content: 'local preview', createdAt: '' }], status: 'completed', updatedAt: '' }] }));
      window.__exports = []; window.__pages = []; window.__fail = false;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), saveConversation: async input => { window.__exports.push(input); return { ok: true }; } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/items/list') {
          window.__pages.push(params);
          if (window.__fail) return { ok: false, error: 'History unavailable' };
          return { ok: true, result: params.cursor ? { data: [{ item: { type: 'agentMessage', text: 'Final reply' } }, { item: { type: 'futureTool', payload: '``` nested ```' } }], nextCursor: null } : { data: [{ item: { type: 'userMessage', content: [{ type: 'text', text: '你好' }, { type: 'localImage', path: 'D:/image.png' }] } }, { item: { type: 'commandExecution', command: 'pwd', aggregatedOutput: 'D:/workspace' } }], nextCursor: 'second' } };
        }
        return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const button = page.getByRole('button', { name: '导出 Markdown', exact: true });
    await button.click();
    await page.waitForFunction(() => window.__exports.length === 1);
    const data = await page.evaluate(() => window.__exports[0]);
    assert.equal(data.filename, 'Export test.md');
    for (const text of ['服务端完整分页记录', '你好', 'D:/image.png', 'D:/workspace', 'Final reply', 'futureTool', '````']) assert.ok(data.content.includes(text), text);
    assert.ok(data.content.indexOf('你好') < data.content.indexOf('Final reply'));
    assert.deepEqual(await page.evaluate(() => window.__pages.map(params => params.cursor)), [undefined, 'second']);
    await page.evaluate(() => { window.__fail = true; });
    await button.click();
    await page.getByText('导出失败：History unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__exports.length), 1);
    const local = await browser.newPage();
    await local.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'local', threads: [{ id: 'local', title: 'CON', status: 'completed', messages: [{ id: 'message', role: 'user', content: 'Local body', plugins: [{id:'docs@local',name:'Docs'}], attachments: ['D:/notes.txt'], skills: [{ name: 'build', path: 'D:/SKILL.md' }] }], updatedAt: '' }] }));
      window.__saved = [];
      window.desktop = { saveConversation: async input => { window.__saved.push(input); return { ok: false, error: 'Disk full' }; } };
    });
    await local.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await local.getByRole('button', { name: '导出本机记录', exact: true }).click();
    await local.getByText('导出失败：Disk full', { exact: true }).waitFor();
    const exported = await local.evaluate(() => window.__saved[0]);
    assert.equal(exported.filename, 'conversation-CON.md');
    for (const value of ['本机已加载记录（可能不完整）', 'Local body', 'docs@local', 'Docs', 'D:/notes.txt', 'D:/SKILL.md']) assert.ok(exported.content.includes(value));
    await local.close();
    console.log('PASS: full pagination, messages, attachment references, tool and unknown records, history failure without partial export');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
