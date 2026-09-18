const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const file = 'D:/' + 'long-directory/'.repeat(12) + 'notes.txt';
      localStorage.setItem('felix-attachments-v1', JSON.stringify({ new: [file] }));
      window.desktop = { workspaceFile: async () => ({ ok: true, result: { text: 'first\n' + 'long line '.repeat(300) + '\nNeedle', revision: 'test' } }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: /^预览附件：/ }).click();
    const dialog = page.getByRole('dialog', { name: '消息文件预览', exact: true });
    await dialog.getByRole('button', { name: '查找预览内容', exact: true }).click();
    const search = dialog.getByRole('region', { name: '预览查找', exact: true });
    const input = search.getByRole('textbox'); await input.fill('Needle');
    await search.getByRole('status').getByText('1 / 1 处匹配', { exact: true }).waitFor();
    for (const [width, height] of [[1100, 800], [390, 680], [640, 360]]) {
      await page.setViewportSize({ width, height });
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= height);
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'dialog must not scroll horizontally');
      const pre = dialog.locator('pre');
      assert.ok(await pre.evaluate(element => element.scrollWidth > element.clientWidth), 'long lines scroll inside text area');
      const searchBounds = await search.boundingBox(), textBounds = await pre.boundingBox();
      assert.ok(searchBounds.y + searchBounds.height <= textBounds.y + 1, 'search controls stay above text');
      for (const control of await search.locator('input,button').all()) {
        const rect = await control.boundingBox();
        assert.ok(rect.x >= bounds.x && rect.x + rect.width <= bounds.x + bounds.width);
      }
      await search.getByRole('button', { name: '下一处', exact: true }).click();
    }
    await dialog.getByRole('button', { name: '关闭预览', exact: true }).click();
    console.log('PASS: preview controls stack above independently scrolling text and stay within narrow/short viewports');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
