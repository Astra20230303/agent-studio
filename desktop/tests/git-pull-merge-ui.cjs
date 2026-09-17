const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo' }], threads: [] }));
      window.__calls = []; window.__mode = 'dirty';
      window.desktop = { workspaceGit: async input => {
        window.__calls.push(input);
        if (input.action === 'pull-merge') { window.__mode = 'conflict'; return { ok: false, error: 'CONFLICT: resolve files' }; }
        return { ok: true, result: { root: 'D:/repo', branch: 'main', head: 'abc', remote: 'origin', upstream: 'origin/target', merging: window.__mode === 'conflict', files: window.__mode === 'clean' ? [] : [{ path: 'a.txt', index: window.__mode === 'conflict' ? 'U' : ' ', working: window.__mode === 'conflict' ? 'U' : 'M' }] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    const button = page.getByRole('button', { name: '拉取并合并上游', exact: true });
    await button.waitFor(); assert.ok(await button.isDisabled());
    await page.evaluate(() => window.__mode = 'clean');
    await page.getByRole('button', { name: '刷新变更', exact: true }).click();
    await button.click();
    await page.getByText('有 1 个未解决冲突', { exact: true }).waitFor();
    await page.getByText('CONFLICT: resolve files', { exact: true }).waitFor();
    assert.ok(await button.isDisabled());
    const call = await page.evaluate(() => window.__calls.find(c => c.action === 'pull-merge'));
    assert.equal(call.expectedBranch, 'main'); assert.equal(call.expectedHead, 'abc');
    await page.getByRole('button', { name: '让 Felix 处理冲突', exact: true }).click();
    assert.match(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), /a.txt/);
    console.log('PASS: upstream merge entry, dirty guard, request identity, conflict refresh and assistance draft');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
