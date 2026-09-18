const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo' }], threads: [] }));
      window.__branch = 'main'; window.__calls = []; window.__fail = true; window.__badBranches = '';
      window.desktop = { workspaceGit: async input => {
        window.__calls.push(input);
        if (input.action === 'status') return { ok: true, result: { root: 'D:/repo', branch: window.__branch, files: [] } };
        if (input.action === 'branches') {
          if (window.__badBranches === 'duplicate') return { ok: true, result: { branches: ['main', 'main'], current: 'main', head: 'a'.repeat(40) } };
          return { ok: true, result: { branches: ['main', 'feature'], current: window.__branch, head: 'a'.repeat(40) } };
        }
        if (input.action === 'switch-branch') {
          if (window.__hold) await new Promise(resolve => window.__release = resolve);
          if (window.__fail) return { ok: false, error: 'local edits would be overwritten' };
          window.__branch = input.branch; return { ok: true, result: { branch: input.branch } };
        }
        throw Error(input.action);
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '切换分支', exact: true }).click();
    const submit = page.getByRole('button', { name: '切换到所选分支', exact: true });
    await page.getByText('当前：main', { exact: true }).waitFor();
    await page.getByRole('combobox', { name: '目标分支' }).selectOption('feature'); await submit.click();
    await page.getByRole('alert').getByText('local edits would be overwritten', { exact: true }).waitFor();
    await page.evaluate(() => { window.__fail = false; window.__hold = true; }); await submit.click();
    await page.waitForFunction(() => Boolean(window.__release)); await page.evaluate(() => window.__release());
    await page.getByText('已切换到 feature', { exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.__calls.find(c => c.action === 'switch-branch').expectedHead)).length, 40);
    await page.evaluate(() => { window.__badBranches = 'duplicate'; }); await page.getByRole('button', { name: '切换分支', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Git 分支数据无效' }).waitFor();
    await page.evaluate(() => { window.__badBranches = ''; }); await page.getByRole('button', { name: '刷新分支列表', exact: true }).click();
    await page.getByText('当前：feature', { exact: true }).waitFor();
    console.log('PASS: branch switch guards current branch, validates snapshots, reports failure and retries');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
