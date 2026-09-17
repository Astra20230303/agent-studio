const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'Repo', path: 'D:/repo' }], threads: [] }));
      window.__calls = []; window.__rejectPush = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), workspaceGit: async input => {
        window.__calls.push(input);
        if (input.action === 'pull') return window.__rejectPull ? { ok: false, error: 'Not possible to fast-forward' } : { ok: true, result: { upstream: 'origin/target', commit: '1234567890', changed: !window.__current } };
        if (input.action === 'publish') { window.__untracked = false; return { ok: true, result: { upstream: 'backup/main' } }; }
        if (input.action === 'push' && window.__rejectPush) return { ok: false, error: 'non-fast-forward' };
        return { ok: true, result: input.action === 'status' ? { root: 'D:/repo', branch: 'main', remotes: ['origin', 'backup'], upstream: window.__untracked ? undefined : 'origin/target', remote: 'origin', ahead: 1, behind: 2, files: [] } : { upstream: 'origin/target' } };
      } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByText('上游：origin/target · 领先 1 · 落后 2', { exact: true }).waitFor();
    await page.getByRole('button', { name: '获取远端', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '远端信息已更新' }).waitFor();
    await page.evaluate(() => { window.__rejectPull = true; });
    await page.getByRole('button', { name: '拉取更新（仅快进）', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Not possible to fast-forward' }).waitFor();
    await page.evaluate(() => { window.__rejectPull = false; });
    await page.getByRole('button', { name: '拉取更新（仅快进）', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '已从 origin/target 更新到 12345678' }).waitFor();
    await page.evaluate(() => { window.__current = true; });
    await page.getByRole('button', { name: '拉取更新（仅快进）', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '当前分支已是最新' }).waitFor();
    await page.getByRole('button', { name: '推送到上游', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'non-fast-forward' }).waitFor();
    await page.evaluate(() => { window.__rejectPush = false; });
    await page.getByRole('button', { name: '推送到上游', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '已推送到 origin/target' }).waitFor();
    await page.evaluate(() => { window.__untracked = true; });
    await page.getByRole('button', { name: '刷新变更', exact: true }).click();
    await page.getByText('未配置上游分支', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '推送到上游', exact: true }).isDisabled(), true);
    await page.getByRole('combobox', { name: '发布远端', exact: true }).selectOption('backup');
    await page.getByRole('button', { name: '发布当前分支', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '已推送到 backup/main' }).waitFor();
    const publish = await page.evaluate(() => window.__calls.find(call => call.action === 'publish'));
    assert.equal(publish.remote, 'backup'); assert.equal(publish.expectedBranch, 'main');
    await page.getByRole('button', { name: '发布当前分支', exact: true }).waitFor({ state: 'detached' });
    assert.ok(await page.evaluate(() => window.__calls.every(call => call.root === 'D:/repo')));
    console.log('PASS: upstream counts, fetch, rejected push/retry and missing-upstream guard');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
