const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      window.__requests = [];
      const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__requests.push({ method, params });
        const result = method === 'plugin/list' ? { marketplaces: [] } : method === 'skills/list' ? { data: [{ errors: [], skills: [{ name: 'sample', path: 'D:/skills/sample/SKILL.md', description: 'Example skill', enabled: true, scope: 'repo' }] }] } : method === 'thread/start' ? { thread: { id: 'skill-thread', turns: [] } } : method === 'turn/start' ? { turn: { id: window.__running ? 'running-skill-turn' : 'skill-turn', status: window.__running ? 'inProgress' : 'completed' } } : method === 'turn/steer' ? { turnId: 'running-skill-turn' } : { data: [] };
        return { ok: true, result };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
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
    await page.evaluate(() => { window.__running = true; });
    await select();
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    await select();
    await page.getByRole('button', { name: '追加指令', exact: true }).click();
    await page.waitForFunction(() => window.__requests.some(call => call.method === 'turn/steer'));
    const expected = [{ type: 'skill', name: 'sample', path: 'D:/skills/sample/SKILL.md' }];
    assert.deepEqual(await page.evaluate(() => window.__requests.find(call => call.method === 'turn/steer').params.input), expected);
    await select();
    await page.getByRole('button', { name: '本轮完成后发送', exact: true }).click();
    await page.getByLabel('待发送消息').getByText('$sample', { exact: true }).waitFor();
    const before = await page.evaluate(() => window.__requests.filter(call => call.method === 'turn/start').length);
    await page.evaluate(() => { window.__running = false; window.__notify({ method: 'turn/completed', params: { threadId: 'skill-thread', turn: { id: 'running-skill-turn', status: 'completed' } } }); });
    await page.waitForFunction(before => window.__requests.filter(call => call.method === 'turn/start').length > before, before);
    assert.deepEqual(await page.evaluate(() => window.__requests.filter(call => call.method === 'turn/start').at(-1).params.input), expected);
    console.log('PASS: explicit skill selection, deduplication, persisted draft, skill-only turn input and successful cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
