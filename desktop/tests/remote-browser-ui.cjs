const { _electron: electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [path.resolve(__dirname, '../electron/main.cjs')], env });
  try {
    const page = await app.firstWindow();
    const panel = page.locator('#remote-browser');
    if (process.env.FELIX_TEST_REMOTE_HOST) {
      const result = await page.evaluate(host => window.desktop.remoteAction({ type: 'prepare', host, username: 'bianbu' }), process.env.FELIX_TEST_REMOTE_HOST);
      assert.ok(!result.isError, result.content?.[0]?.text);
      await panel.waitFor({ state: 'visible' });
    } else {
      await page.getByRole('button', { name: '浏览器', exact: true }).click();
      await panel.getByRole('button', { name: '连接远程桌面', exact: true }).click();
    }
    const frame = page.frameLocator('iframe[title="noVNC 远程桌面"]');
    await frame.locator('html.noVNC_connected').waitFor({ timeout: 45000 });
    const canvas = frame.locator('#noVNC_container canvas');
    assert.ok(await canvas.evaluate(c => c.width > 0 && c.height > 0));
    assert.equal(await canvas.evaluate(async () => (await import('/app/ui.js')).default.rfb.showDotCursor), true, 'Transparent remote cursors need a visible local fallback');
    assert.equal(await canvas.evaluate(async () => (await import('/app/ui.js')).default.rfb.viewOnly), false, 'Embedded desktop must accept user input');
    const cursorBox = await canvas.boundingBox();
    await page.mouse.move(cursorBox.x + cursorBox.width / 2, cursorBox.y + cursorBox.height / 2);
    if (process.env.FELIX_TEST_MANUAL_CLICK === '1') {
      // Opt-in real desktop check: current BiBit Agent Hub, My Power / Power Market tabs.
      const original = await canvas.evaluate(c => c.toDataURL());
      await page.mouse.click(cursorBox.x + cursorBox.width * .225, cursorBox.y + cursorBox.height * .142);
      await page.waitForTimeout(1200);
      assert.notEqual(await canvas.evaluate(c => c.toDataURL()), original, 'Remote framebuffer did not respond to the embedded click');
      await page.screenshot({ path: path.resolve(__dirname, '../../.project-cache/remote-browser-click.png') });
      await page.mouse.click(cursorBox.x + cursorBox.width * .30, cursorBox.y + cursorBox.height * .142);
      await page.waitForTimeout(700);
    }
    const before = await panel.boundingBox();
    const main = await page.locator('.desktop-body > main').boundingBox();
    assert.ok(before.x >= main.x + main.width - 2, 'Panel overlaps chat');
    const action = await page.evaluate(() => window.desktop.remoteAction({ type: 'move', x: 100, y: 100 }));
    assert.ok(action.content.some(part => part.type === 'image'));
    await page.screenshot({ path: path.resolve(__dirname, '../../.project-cache/remote-browser-ui.png') });
    await panel.getByRole('button', { name: '展开浏览器面板' }).click();
    assert.ok((await panel.boundingBox()).width > before.width);
    await panel.getByRole('button', { name: '还原浏览器面板' }).click();
    await panel.getByRole('button', { name: '关闭浏览器面板' }).click();
    assert.equal((await page.evaluate(() => window.desktop.remoteStatus())).connected, true);
    await page.getByRole('button', { name: '浏览器', exact: true }).click();
    await frame.locator('html.noVNC_connected').waitFor();
    await panel.getByRole('button', { name: '停止控制' }).click();
    await panel.getByRole('button', { name: '连接远程桌面', exact: true }).waitFor();
    console.log('PASS: live embedded noVNC, concurrent Agent input, split layout, expand/restore, close/reopen, stop.');
  } catch (error) {
    await (await app.firstWindow()).screenshot({ path: path.resolve(__dirname, '../../.project-cache/remote-browser-failure.png') });
    throw error;
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
