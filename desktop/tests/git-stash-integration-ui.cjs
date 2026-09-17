const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { workspaceGit } = require('../electron/workspace-git.cjs');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-stash-ui-'));
  let browser;
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: 'pipe' }).trim();
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    await fs.writeFile(path.join(root, '.gitignore'), 'runtime/');
    await fs.writeFile(path.join(root, 'tracked.txt'), 'base');
    git('add', '.'); git('commit', '-m', 'base');
    await fs.mkdir(path.join(root, 'runtime'));
    await fs.writeFile(path.join(root, 'runtime', 'keep'), 'runtime');
    await fs.writeFile(path.join(root, 'tracked.txt'), 'edited');
    await fs.writeFile(path.join(root, 'new.txt'), 'new');
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
    await page.getByRole('button', { name: '暂存工作区', exact: true }).click();
    await page.getByText('已暂存工作区修改，可随时恢复', { exact: true }).waitFor();
    await page.getByText('工作区没有变更。', { exact: true }).waitFor();
    assert.equal(await fs.readFile(path.join(root, 'runtime', 'keep'), 'utf8'), 'runtime');
    await assert.rejects(fs.stat(path.join(root, 'new.txt')), { code: 'ENOENT' });
    await page.getByRole('button', { name: '恢复最近暂存', exact: true }).click();
    await page.getByText('已恢复最近一次工作区暂存', { exact: true }).waitFor();
    await page.getByRole('button', { name: '暂存 new.txt', exact: true }).waitFor();
    assert.equal(await fs.readFile(path.join(root, 'tracked.txt'), 'utf8'), 'edited');
    assert.equal(await fs.readFile(path.join(root, 'new.txt'), 'utf8'), 'new');
    assert.equal(git('stash', 'list'), '');
    assert.ok(await page.getByRole('button', { name: '恢复最近暂存', exact: true }).isDisabled());
    console.log('PASS: real Git stash/restore from browser preserves ignored data and refreshes controls');
  } finally {
    await browser?.close();
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
