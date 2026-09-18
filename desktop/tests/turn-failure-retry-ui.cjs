const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({
        model: 'test', activeThreadId: 'failed', projects: [], threads: [{ id: 'failed', remoteId: 'remote-failed', title: 'Failed turn', status: 'failed', pinned: false, archived: false, messages: [
          { id: 'user-1', role: 'user', content: '继续修复这个问题', attachments: ['D:/notes.txt'], skills: [{ name: 'Review', path: 'D:/SKILL.md' }], plugins: [{ id: 'plug', name: 'Inspector' }], turnId: 'turn-1', createdAt: new Date().toISOString() },
          { id: 'error-turn-1', role: 'system', content: '网络连接失败，请重试。', createdAt: new Date().toISOString() },
        ], updatedAt: new Date().toISOString() }],
      }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), request: async method => method === 'thread/resume' ? ({ ok: true, result: { thread: { id: 'remote-failed', turns: [] } } }) : ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByText('网络连接失败，请重试。', { exact: true }).waitFor();
    const retry = page.getByRole('button', { name: '恢复本轮输入', exact: true });
    await retry.click();
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), '继续修复这个问题');
    await page.getByRole('button', { name: '移除附件：D:/notes.txt', exact: true }).waitFor();
    await page.getByText('$Review', { exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-plugin-drafts-v1')).failed?.[0]?.id === 'plug');
    assert.equal(await retry.isDisabled(), true);
    assert.equal(await page.getByText('已恢复失败回合，请检查草稿后重新发送。', { exact: true }).count(), 1);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.equal(state.threads[0].messages.find(message => message.id === 'user-1').content, '继续修复这个问题');
    assert.equal(state.threads[0].messages.some(message => message.id === 'error-turn-1'), true);
    console.log('PASS: failed turn restores its original text, attachments, skills and plugins without auto-sending');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
