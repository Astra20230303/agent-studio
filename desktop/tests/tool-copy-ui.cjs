const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const output = '中文 output\r\n\tindent <tag>\n'.repeat(4000);
    await page.addInitScript(output => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Tools', messages: [
        { id: 'cmd', role: 'assistant', content: '', tool: { kind: 'commandExecution', status: 'failed', command: 'printf "hello"', output, exitCode: 1 } },
        { id: 'mcp', role: 'assistant', content: '', tool: { kind: 'mcpToolCall', status: 'failed', invocation: { server: 'test', name: 'lookup', arguments: { q: '中文' }, result: { content: [{ type: 'text', text: 'found' }] }, error: 'service error' } } },
      ], status: 'completed', updatedAt: '' }] }));
      window.__copies = []; window.__fail = true;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.__fail) throw Error('Denied'); window.__copies.push(text); } } });
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
    }, output);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.locator('.tool-row summary').first().click();
    await page.getByRole('button', { name: '复制输出', exact: true }).click();
    await page.getByText('复制失败，请检查剪贴板权限后重试。', { exact: true }).waitFor();
    await page.evaluate(() => { window.__fail = false; });
    for (const name of ['复制命令', '复制输出']) await page.getByRole('button', { name, exact: true }).click();
    await page.locator('.tool-row summary').nth(1).click();
    for (const name of ['复制参数', '复制结果', '复制错误']) await page.getByRole('button', { name, exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__copies), ['printf "hello"', output, JSON.stringify({ q: '中文' }, null, 2), JSON.stringify({ content: [{ type: 'text', text: 'found' }] }, null, 2), 'service error']);
    assert.deepEqual(errors, []);
    console.log('PASS: exact command/long output/MCP arguments/result/error copies and clipboard recovery');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
