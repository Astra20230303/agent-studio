const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => {
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), listProviders: async () => [] };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    const nav = page.getByRole('navigation', { name: '设置分类' });
    assert.deepEqual(await nav.getByRole('button').allTextContents(), ['常规', '权限', '配置', '键盘快捷键', '电脑操控']);
    const search = page.getByRole('searchbox', { name: '搜索设置' });
    await search.fill(' 沙箱 ');
    await page.getByRole('heading', { name: '权限', exact: true }).waitFor();
    assert.deepEqual(await nav.getByRole('button').allTextContents(), ['权限']);
    await page.getByRole('radio', { name: '帮我审批', exact: true }).check();
    await search.fill('API KEY');
    await page.getByRole('heading', { name: '配置', exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Provider 名称', exact: true }).waitFor();
    await search.fill('发送');
    await page.getByRole('combobox', { name: '发送快捷键' }).selectOption('mod-enter');
    await search.fill('no-such-setting-123');
    await page.getByRole('status').filter({ hasText: '没有匹配的设置' }).waitFor();
    assert.equal(await nav.getByRole('button').count(), 0);
    assert.equal(await page.getByRole('combobox').count(), 0);
    await page.getByRole('button', { name: '清除搜索', exact: true }).click();
    await nav.getByRole('button', { name: '权限', exact: true }).click();
    assert.equal(await page.getByRole('radio', { name: '帮我审批', exact: true }).isChecked(), true);
    await search.fill('theme');
    await page.getByRole('combobox', { name: '主题', exact: true }).selectOption('dark');
    await search.press('Escape');
    assert.equal(await search.inputValue(), '');
    await nav.getByRole('button', { name: '键盘快捷键', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: '发送快捷键' }).inputValue(), 'mod-enter');
    console.log('PASS: settings category routing, keyword search, empty/clear/Escape and preserved changes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
