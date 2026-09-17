const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo' }], threads: [] }));
      window.__calls = []; window.__allow = false;
      window.desktop = { workspaceGit: async input => {
        window.__calls.push(input);
        if (input.action === 'worktrees') return { ok: true, result: { worktrees: [{ path: 'D:/repo', head: 'main' }, ...window.__removed ? [] : [{ path: 'D:/child', head: 'abc', branch: 'feature' }]] } };
        if (input.action === 'remove-worktree') { if (!window.__allow) return { ok: false, error: '工作树包含修改' }; window.__removed = true; return { ok: true, result: { removed: input.path } }; }
        return { ok: true, result: { root: 'D:/repo', branch: 'main', files: [] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '浏览工作树', exact: true }).click();
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).click();
    await page.getByRole('button', { name: '取消删除工作树', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__calls.filter(c => c.action === 'remove-worktree').length), 0);
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).click();
    await page.getByRole('button', { name: '确认删除工作树', exact: true }).click();
    await page.getByText('工作树包含修改', { exact: true }).waitFor();
    await page.evaluate(() => window.__allow = true);
    await page.getByRole('button', { name: '确认删除工作树', exact: true }).click();
    await page.getByText('已删除工作树 D:/child，分支与提交保留。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.__calls.find(c => c.action === 'remove-worktree').expectedHead), 'abc');
    console.log('PASS: worktree removal cancellation, failure retry, expected HEAD and refreshed inventory');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
