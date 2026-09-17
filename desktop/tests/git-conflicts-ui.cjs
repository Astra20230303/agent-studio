const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'Repo', path: 'D:/repo' }], threads: [] }));
      window.__requests = [];
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), workspaceGit: async input => {
        window.__requests.push(input);
        if (input.action === 'conflict') return { ok: true, result: { stages: [{ stage: 1, text: 'base content' }, { stage: 2, text: '<script>current side</script>' }] } };
        if (input.action === 'diff') return { ok: true, result: { diff: 'conflict working copy' } };
        if (input.action === 'stage') window.__resolved = true;
        return { ok: true, result: { root: 'D:/repo', branch: 'main', files: [{ path: 'conflict.txt', index: window.__resolved ? 'M' : 'U', working: window.__resolved ? ' ' : 'U', untracked: false }] } };
      } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => { window.__requests.push({ method, params }); return { ok: true, result: { data: [] } }; }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Existing draft');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByText('有 1 个未解决冲突', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: '提交说明', exact: true }).fill('resolve');
    assert.equal(await page.getByRole('button', { name: '提交已暂存变更', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '已暂存 U', exact: true }).count(), 0);
    await page.getByRole('button', { name: '未暂存 U', exact: true }).click();
    await page.getByLabel('冲突版本').getByText('base content', { exact: true }).waitFor();
    await page.getByLabel('冲突版本').getByText('<script>current side</script>', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('冲突版本').locator('script').count(), 0);
    await page.getByText('此阶段没有文件（新增或删除）。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '返回变更', exact: true }).click();
    await page.getByRole('button', { name: '让 Felix 处理冲突', exact: true }).click();
    const draft = await page.getByRole('textbox', { name: '消息', exact: true }).inputValue();
    assert.ok(draft.startsWith('Existing draft\n\n')); assert.ok(draft.includes('D:/repo')); assert.ok(draft.includes('conflict.txt'));
    assert.equal(await page.evaluate(() => window.__requests.filter(call => call.method === 'turn/start').length), 0);
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '标记已解决 conflict.txt', exact: true }).click();
    await page.getByText('有 1 个未解决冲突', { exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '已暂存 M', exact: true }).waitFor();
    console.log('PASS: conflict identification, commit guard, preserved review draft and resolved staging refresh');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
