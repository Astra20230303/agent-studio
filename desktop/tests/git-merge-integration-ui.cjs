const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { workspaceGit } = require('../electron/workspace-git.cjs');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-merge-ui-'));
  let browser;
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: 'pipe' }).trim();
    git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    await fs.writeFile(path.join(root, 'file.txt'), 'base');
    git('add', '.'); git('commit', '-m', 'base'); git('switch', '-c', 'feature');
    await fs.writeFile(path.join(root, 'file.txt'), 'feature');
    git('commit', '-am', 'feature'); git('switch', 'main');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    await page.exposeFunction('realWorkspaceGit', async input => {
      assert.equal(input.root, root);
      try { return { ok: true, result: await workspaceGit(input) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(root => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: root }], threads: [] }));
      window.desktop = { workspaceGit: input => window.realWorkspaceGit(input) };
    }, root);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('combobox', { name: '合并本地分支' }).selectOption('feature');
    await page.getByRole('button', { name: '合并', exact: true }).click();
    await page.getByText('已合并 feature', { exact: true }).waitFor();
    assert.equal(await fs.readFile(path.join(root, 'file.txt'), 'utf8'), 'feature');
    git('switch', '-c', 'conflicting');
    await fs.writeFile(path.join(root, 'file.txt'), 'conflict'); git('commit', '-am', 'conflict');
    git('switch', 'main');
    await fs.writeFile(path.join(root, 'file.txt'), 'main'); git('commit', '-am', 'main');
    await page.getByRole('button', { name: '刷新变更', exact: true }).click();
    await page.getByRole('combobox', { name: '合并本地分支' }).selectOption('conflicting');
    await page.getByRole('button', { name: '合并', exact: true }).click();
    await page.getByText('有 1 个未解决冲突', { exact: true }).waitFor();
    const failure = page.getByRole('alert').filter({ hasText: 'CONFLICT' });
    await failure.waitFor();
    await page.getByRole('button', { name: '刷新变更', exact: true }).click();
    await page.getByText('有 1 个未解决冲突', { exact: true }).waitFor();
    await failure.waitFor();
    await page.getByRole('button', { name: '未暂存 U', exact: true }).click();
    await page.getByRole('button', { name: '返回变更', exact: true }).click();
    await failure.waitFor();
    assert.ok(git('rev-parse', '--verify', 'MERGE_HEAD'));
    assert.ok(await page.getByRole('button', { name: '合并', exact: true }).isDisabled());
    assert.ok(await page.getByRole('combobox', { name: '合并本地分支' }).isDisabled());
    // Resolve entirely to ours: no staged diff, but MERGE_HEAD requires a commit.
    await fs.writeFile(path.join(root, 'file.txt'), 'main');
    await page.getByRole('button', { name: '标记已解决 file.txt', exact: true }).click();
    await page.getByText('合并尚未完成，请解决并暂存冲突后提交。', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
    assert.equal(git('diff', '--cached'), '');
    await page.getByRole('textbox', { name: '提交说明' }).fill('Resolve conflict using ours');
    await page.getByRole('button', { name: '完成合并提交', exact: true }).click();
    await page.getByText('工作区没有变更。', { exact: true }).waitFor();
    assert.equal(git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3);
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.ok(await page.getByRole('combobox', { name: '合并本地分支' }).isEnabled());
    console.log('PASS: real browser merge target, persistent conflict error, resolution and two-parent empty-diff merge commit');
  } finally { await browser?.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
