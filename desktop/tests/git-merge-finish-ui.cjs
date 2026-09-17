const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { GitPanel } = await import('/src/GitPanel.tsx');
      window.__merging = true; window.__commits = [];
      window.desktop = { workspaceGit: async input => {
        if (input.action === 'status') return { ok: true, result: { root: 'D:/test', branch: 'main', merging: window.__merging, files: [] } };
        window.__commits.push(input); window.__merging = false;
        return { ok: true, result: { commit: '1234567890' } };
      } };
      const host = document.createElement('div'); host.id = 'merge-fixture'; document.body.append(host);
      ReactDOM.createRoot(host).render(React.createElement(GitPanel, { root: 'D:/test', onClose() {}, onReview() {}, onWorktree() {} }));
    });
    const panel = page.locator('#merge-fixture');
    await panel.getByText('合并尚未完成，请解决并暂存冲突后提交。').waitFor();
    await panel.getByRole('textbox', { name: '提交说明' }).fill('Resolve using ours');
    await panel.getByRole('button', { name: '完成合并提交' }).click();
    await panel.getByText('已提交 12345678').waitFor();
    assert.ok(await panel.getByRole('button', { name: '提交已暂存变更' }).isDisabled());
    assert.equal(await page.evaluate(() => window.__commits[0].message), 'Resolve using ours');
    console.log('PASS: empty-tree merge commit is enabled only while merging');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
