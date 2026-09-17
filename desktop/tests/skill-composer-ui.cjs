const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      window.__requests = [];
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__requests.push({ method, params });
        const result = method === 'plugin/list' ? { marketplaces: [] } : method === 'skills/list' ? { data: [{ errors: [], skills: [{ name: 'sample', path: 'D:/skills/sample/SKILL.md', description: 'Example skill', enabled: true, scope: 'repo' }] }] } : method === 'thread/start' ? { thread: { id: 'skill-thread', turns: [] } } : method === 'turn/start' ? { turn: { id: 'skill-turn', status: 'completed' } } : { data: [] };
        return { ok: true, result };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const select = async () => {
      await page.getByRole('button', { name: '插件', exact: true }).click();
      await page.getByRole('tab', { name: '技能', exact: true }).click();
      await page.getByRole('button', { name: /sample Example skill/ }).click();
      await page.getByRole('button', { name: '在聊天中使用', exact: true }).click();
    };
    await select(); await select();
    assert.equal(await page.getByRole('button', { name: '移除技能 sample', exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => window.__requests.filter(call => call.method === 'turn/start').length), 0);
    await page.reload();
    await page.getByRole('button', { name: '移除技能 sample', exact: true }).waitFor();
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__requests.some(call => call.method === 'turn/start'));
    assert.deepEqual(await page.evaluate(() => window.__requests.find(call => call.method === 'turn/start').params.input), [{ type: 'skill', name: 'sample', path: 'D:/skills/sample/SKILL.md' }]);
    await page.getByRole('button', { name: '移除技能 sample', exact: true }).waitFor({ state: 'detached' });
    await page.locator('.message.user').getByText('$sample', { exact: true }).waitFor();
    console.log('PASS: explicit skill selection, deduplication, persisted draft, skill-only turn input and successful cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
