const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (localStorage.getItem('codex-desktop-state-v1')) return;
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'old', threads: [{ id: 'old', title: 'Original', cwd: 'D:/old', messages: [], status: 'completed', updatedAt: '' }], projects: [
        { id: 'D:/repo', name: 'Same', path: 'D:/repo', environment: 'local', git: { isRepository: true } },
        { id: 'D:/trees/feature', name: 'Same', path: 'D:/trees/feature', environment: 'worktree', git: { isRepository: true } },
      ] }));
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const search = page.getByRole('combobox', { name: '搜索命令', exact: true });
    const dialog = page.getByRole('dialog', { name: '命令面板', exact: true });
    await input.fill('Keep original draft');
    await page.keyboard.press('Control+Shift+P');
    await search.fill('Same');
    assert.equal(await dialog.getByRole('option').count(), 2);
    await search.fill('D:/trees/feature');
    assert.match(await dialog.innerText(), /工作树/);
    await search.press('Enter');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '消息');
    assert.equal(await input.inputValue(), '');
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    const active = state.threads.find(t => t.id === state.activeThreadId);
    assert.equal(active.cwd, 'D:/trees/feature');
    assert.equal(active.projectId, 'D:/trees/feature');
    assert.equal(state.activeProjectId, 'D:/trees/feature');
    assert.equal(state.threads.length, 2);
    const audit = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')));
    assert.equal(audit.filter(e => e.action === '切换项目').length, 1);
    assert.ok(audit.every(e => e.detail === undefined));
    await page.getByRole('button', { name: 'Original', exact: true }).click();
    assert.equal(await input.inputValue(), 'Keep original draft');
    await page.keyboard.press('Control+Shift+P'); await search.fill('Same'); await search.press('Escape');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length), 2);
    await page.reload();
    await input.waitFor();
    await page.keyboard.press('Control+Shift+P'); await search.fill('Same');
    assert.equal(await dialog.getByRole('option').count(), 2);
    console.log('PASS: project palette searches name/path, distinguishes worktrees, binds cwd, preserves drafts, cancels without mutation and survives reload');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
