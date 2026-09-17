const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const scenario of ['thread', 'project', 'fallback']) {
      const page = await browser.newPage();
      await page.addInitScript(scenario => {
        const thread = { id: 'a', title: 'Workspace conversation', messages: [], status: 'completed', updatedAt: new Date().toISOString(), ...(scenario === 'thread' ? { cwd: 'D:/work/thread' } : {}) };
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [thread], projects: [{ id: 'p', name: 'Project', path: 'D:/work/project' }], ...(scenario !== 'fallback' ? { activeProjectId: 'p' } : {}) }));
        window.__requests = [];
        window.desktop = { getProjectRoot: async () => 'D:/app', providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
          window.__requests.push({ method, params });
          return { ok: true, result: method === 'plugin/list' ? { marketplaces: [] } : method === 'skills/list' ? { data: [{ errors: [], skills: [{ name: 'workspace-skill', description: params.cwds[0], path: params.cwds[0] + '/.agents/skills/sample/SKILL.md', enabled: true, scope: 'repo' }] }] } : { data: [] } };
        }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      }, scenario);
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      await page.getByRole('button', { name: '插件', exact: true }).click();
      await page.getByRole('tab', { name: '技能', exact: true }).click();
      await page.getByRole('button', { name: /workspace-skill/ }).waitFor();
      const expected = scenario === 'thread' ? 'D:/work/thread' : scenario === 'project' ? 'D:/work/project' : 'D:/app';
      for (const method of ['plugin/list', 'skills/list']) {
        const calls = await page.evaluate(method => window.__requests.filter(call => call.method === method), method);
        assert.ok(calls.length);
        assert.ok(calls.every(call => JSON.stringify(call.params.cwds) === JSON.stringify([expected])), `${scenario}: ${method} must use the effective workspace`);
      }
      await page.close();
    }
    console.log('PASS: extension discovery uses thread cwd, selected project and app fallback in priority order');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
