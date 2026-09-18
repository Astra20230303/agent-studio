const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__saved = []; window.__failBeta = true;
      window.desktop = {
        listProviders: async () => [{ id: 'a', name: 'Alpha', enabled: true }, { id: 'b', name: 'Beta' }],
        providerStatus: async () => ({ keyConfigured: true }),
        listModels: async input => input?.providerId === 'b'
          ? window.__failBeta ? { ok: false, error: 'Beta unavailable' } : { ok: true, models: ['beta-model'] }
          : { ok: true, models: ['alpha-model'] },
        listTasks: async () => ({ ok: true, tasks: [] }),
        saveTask: async input => { window.__saved.push(input); return { ok: true }; },
      };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '已安排', exact: true }).click();
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Agent 任务' }).click();
    const dialog = page.getByRole('dialog', { name: '创建任务' });
    await dialog.getByLabel('任务名称', { exact: true }).fill('Beta task');
    await dialog.getByLabel('任务内容', { exact: true }).fill('Read workspace');
    await dialog.getByLabel('任务模型', { exact: true }).selectOption('alpha-model');
    await dialog.getByLabel('任务 Provider', { exact: true }).selectOption('b');
    await dialog.getByRole('alert').getByText('Beta unavailable').waitFor();
    assert.equal(await dialog.getByRole('button', { name: '保存任务' }).isDisabled(), true);
    await page.evaluate(() => { window.__failBeta = false; });
    await dialog.getByRole('button', { name: '刷新模型', exact: true }).click();
    await dialog.getByLabel('任务模型', { exact: true }).selectOption('beta-model');
    await page.evaluate(() => {
      window.desktop.listModels = async () => ({ ok: true, models: ['beta-model', {}] });
    });
    await dialog.getByRole('button', { name: '刷新模型', exact: true }).click();
    await dialog.getByRole('alert').getByText('模型列表格式无效，请刷新重试。').waitFor();
    assert.equal(await dialog.getByRole('button', { name: '保存任务' }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__saved.length), 0);
    await page.evaluate(() => {
      window.desktop.listModels = async () => ({ ok: true, models: ['beta-model', 'beta-model'] });
    });
    await dialog.getByRole('button', { name: '刷新模型', exact: true }).click();
    await dialog.getByRole('option', { name: 'beta-model', exact: true }).waitFor({ state: 'attached' });
    assert.equal(await dialog.getByRole('option', { name: 'beta-model', exact: true }).count(), 1);
    await dialog.getByRole('button', { name: '保存任务' }).click();
    await dialog.waitFor({ state: 'detached' });
    const saved = await page.evaluate(() => window.__saved);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].providerId, 'b');
    assert.equal(saved[0].model, 'beta-model');
    console.log('PASS: task catalog follows its Provider, failed load blocks save and retry saves matching model');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
