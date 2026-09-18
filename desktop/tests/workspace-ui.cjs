const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__requests = [];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'old', model: 'test', threads: [{ id: 'old', remoteId: 'old-remote', title: 'Old workspace', cwd: 'D:/Old', status: 'completed', messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }), getProjectRoot: async () => 'D:/Felix', pickProject: async () => ({ id: 'D:/Actual Project', name: 'Actual Project', path: 'D:/Actual Project', git: { isRepository: false }, environment: 'local' }) };
      localStorage.setItem('felix-audit-log-v1', '[]');
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__requests.push({ method, params });
        if (method === 'thread/start') return { ok: true, result: { thread: { id: 'remote-a' } } };
        if (method === 'turn/start') return { ok: true, result: { turn: { id: 'turn', status: 'completed' } } };
        return { ok: true, result: { data: [] } };
      }, onNotification: () => () => {}, onClosed: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.locator('.project-strip .project').click();
    await page.getByRole('button', { name: '打开文件夹…', exact: true }).click();
    assert.equal(await page.locator('.project-strip .project').getAttribute('title'), 'D:/Actual Project');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).some(item => item.action === '切换项目'));
    const projectAudit = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).find(item => item.action === '切换项目'));
    assert.equal(projectAudit.detail, undefined);
    assert.equal(JSON.stringify(projectAudit).includes('Actual Project'), false);
    assert.equal(JSON.stringify(projectAudit).includes('D:/'), false);
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Inspect project');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__requests.some(r => r.method === 'turn/start'));
    const requests = await page.evaluate(() => window.__requests);
    assert.equal(requests.find(r => r.method === 'thread/start').params.cwd, 'D:/Actual Project');
    assert.equal(requests.find(r => r.method === 'turn/start').params.cwd, 'D:/Actual Project');
    await page.getByRole('button', { name: 'Old workspace', exact: true }).click();
    assert.equal(await page.locator('.project-strip .project').getAttribute('title'), 'D:/Old');
    await page.locator('.project-strip .project').click();
    await page.locator('.project-menu').getByRole('button', { name: 'Actual Project', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(item => item.action === '切换项目').length === 2);
    const projectEntries = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(item => item.action === '切换项目'));
    assert.ok(projectEntries.every(item => item.detail === undefined));
    assert.equal(await page.locator('.project-strip .project').getAttribute('title'), 'D:/Actual Project');
    await page.reload();
    // The injected fixture reopens the old thread despite a different selected project.
    assert.equal(await page.locator('.project-strip .project').getAttribute('title'), 'D:/Old');
    console.log('PASS: folder selection, project audit redaction, thread/turn cwd, displayed root and persistence');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
