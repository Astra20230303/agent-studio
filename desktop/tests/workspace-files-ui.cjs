const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/Project', name: 'Project', git: {} }], threads: [] }));
      window.__reads = [];
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }), workspaceFile: async input => {
        window.__reads.push(input);
        return { ok: true, result: input.action === 'read' ? { text: '<script>never execute</script>\nFile content', truncated: true } : { entries: input.path === '.' ? [{ name: 'src', path: 'src', directory: true }] : [{ name: 'example.ts', path: 'src/example.ts', directory: false }] } };
      } };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    await page.getByRole('button', { name: '▸ src', exact: true }).click();
    await page.getByRole('button', { name: '▧ example.ts', exact: true }).click();
    await page.getByText('仅预览前 256 KB。', { exact: true }).waitFor();
    assert.match(await page.locator('.workspace-files pre').innerText(), /<script>/);
    await page.getByRole('button', { name: '添加到消息', exact: true }).click();
    await page.getByRole('button', { name: '移除附件：D:/Project/src/example.ts', exact: true }).waitFor();
    await page.getByRole('button', { name: '返回目录', exact: true }).click();
    await page.getByRole('button', { name: '上级目录', exact: true }).click();
    await page.getByRole('button', { name: '▸ src', exact: true }).waitFor();
    assert.ok((await page.evaluate(() => window.__reads)).every(item => item.root === 'D:/Project'));
    console.log('PASS: navigation, escaped text preview, truncation notice, attach file, parent navigation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
