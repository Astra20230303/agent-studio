const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo' }], threads: [{ id: 'child-local', remoteId: 'child-remote', cwd: 'd:\\child\\src', title: 'Background', status: 'completed', messages: [], updatedAt: new Date().toISOString() }] }));
      const listeners = new Set();
      window.__emit = message => listeners.forEach(listener => listener(message));
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: listener => { listeners.add(listener); return () => listeners.delete(listener); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
      window.__calls = []; window.__allow = false;
      window.desktop = { workspaceGit: async input => {
        window.__calls.push(input);
        if (input.action === 'worktrees') return { ok: true, result: { worktrees: [{ path: 'D:/repo', head: 'main', current: true }, {path:'D:/primary', head:'main', primary:true}, ...window.__removed ? [] : [{ path: 'D:/child', head: 'abc', branch: 'feature' }]] } };
        if (input.action === 'remove-worktree') { if (!window.__allow) return { ok: false, error: '工作树包含修改' }; if (window.__hold) await new Promise(resolve => window.__release = resolve); window.__removed = true; return { ok: true, result: { removed: input.path } }; }
        return { ok: true, result: { root: 'D:/repo', branch: 'main', files: [] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '浏览工作树', exact: true }).click();
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).click();
    await page.evaluate(() => window.__emit({ method: 'turn/started', params: { threadId: 'child-remote', turn: { id: 'busy-turn', status: 'inProgress' } } }));
    await page.getByText(/会话使用中/).waitFor();
    assert.ok(await page.getByRole('button', { name: '确认删除工作树', exact: true }).isDisabled());
    assert.ok(await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).isDisabled());
    assert.equal(await page.evaluate(() => window.__calls.filter(c => c.action === 'remove-worktree').length), 0);
    await page.evaluate(() => window.__emit({ method: 'turn/completed', params: { threadId: 'child-remote', turn: { id: 'busy-turn', status: 'completed' } } }));
    await page.getByRole('button', { name: '取消删除工作树', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__calls.filter(c => c.action === 'remove-worktree').length), 0);
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).click();
    await page.getByRole('button', { name: '确认删除工作树', exact: true }).click();
    await page.getByText('工作树包含修改', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', {name:'删除工作树 D:/primary',exact:true}).isDisabled());
    await page.evaluate(() => { window.__allow = true; window.__hold = true; });
    await page.getByRole('button', { name: '确认删除工作树', exact: true }).click();
    await page.waitForFunction(() => !!window.__release);
    assert.ok(await page.getByRole('button',{name:'返回 Git 变更',exact:true}).isDisabled());
    assert.ok(await page.getByRole('button',{name:'关闭 Git 面板',exact:true}).isDisabled());
    await page.evaluate(() => window.__release());
    await page.getByText('已删除工作树 D:/child，分支与提交保留。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '删除工作树 D:/child', exact: true }).waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.__calls.find(c => c.action === 'remove-worktree').expectedHead), 'abc');
    assert.ok(await page.getByRole('button', {name:'返回 Git 变更',exact:true}).isEnabled());
    assert.ok(await page.getByRole('button', {name:'关闭 Git 面板',exact:true}).isEnabled());
    await page.getByRole('button', {name:'返回 Git 变更',exact:true}).click();
    await page.getByRole('button', {name:'浏览工作树',exact:true}).waitFor();
    console.log('PASS: worktree removal cancellation, failure retry, expected HEAD and refreshed inventory');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
