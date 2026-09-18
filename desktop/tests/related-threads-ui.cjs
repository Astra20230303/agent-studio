const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!localStorage.getItem('codex-desktop-state-v1')) {
        const thread = (id, messages = [], archived = false) => ({ id, remoteId: id, title: id, cwd: 'D:/' + id, status: 'completed', messages, archived, updatedAt: new Date().toISOString() });
        const message = (id, tool) => ({ id, role: 'assistant', content: '', createdAt: new Date().toISOString(), tool });
        const activity = message('activity', { kind: 'subAgentActivity', status: 'completed', subAgent: { threadId: 'child', kind: 'completed', path: '/root/child' } });
        const collaboration = message('collab', { kind: 'collabAgentToolCall', status: 'completed', collaboration: { tool: 'sendMessage', receiverThreadIds: ['child'], agentsStates: { child: { status: 'completed' } } } });
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'child', model: 'test', threads: [thread('child'), thread('source', [activity, collaboration]), thread('other', [collaboration]), thread('archived', [activity], true), thread('unrelated')] }));
        localStorage.setItem('felix-thread-drafts-v1', JSON.stringify({ child: 'child draft', source: 'source draft' }));
      }
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const nav = page.getByRole('navigation', { name: '关联会话' });
    await nav.waitFor();
    assert.equal(await nav.getByRole('button').count(), 2);
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    assert.equal(await input.inputValue(), 'child draft');
    await input.fill('new child draft');
    await nav.getByRole('button', { name: '返回 source · D:/source', exact: true }).click();
    await nav.waitFor({ state: 'hidden' });
    assert.equal(await input.inputValue(), 'source draft');
    await page.getByRole('button', { name: '打开 Agent child', exact: true }).first().click();
    await nav.waitFor();
    assert.equal(await input.inputValue(), 'new child draft');
    await page.reload();
    await nav.waitFor();
    assert.equal(await nav.getByRole('button').count(), 2);
    assert.equal(await input.inputValue(), 'new child draft');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const button of await nav.getByRole('button').all()) {
      const rect = await button.boundingBox();
      assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= 391);
    }
    console.log('PASS: related sources deduplicated, archived/unrelated excluded, drafts isolated, navigation survives reload and fits narrow viewport');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
