const { _electron: electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: process.env.FELIX_TEST_ELECTRON || require('electron'), args: [path.resolve(__dirname, '../electron/main.cjs')], env });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '电脑操控', exact: true }).click();
    await page.getByRole('button', { name: '连接远程桌面', exact: true }).click();
    await page.getByRole('status').filter({ hasText: /^已连接$/ }).waitFor({ timeout: 45000 });
    const preview = page.getByAltText('远程桌面当前截图');
    assert.ok(await preview.evaluate(img => img.naturalWidth > 0));
    await page.screenshot({ path: path.resolve(__dirname, '../../.project-cache/remote-desktop-settings.png') });
    console.log('PASS: Felix settings connect and render real remote screenshot.');
    console.log('Provider:', await page.evaluate(() => window.desktop.providerStatus()));
    console.log('Models:', await page.evaluate(() => window.desktop.listModels()));
    await page.getByRole('button', { name: '停止控制', exact: true }).click();
    await page.getByRole('status').filter({ hasText: /^已停止控制$/ }).waitFor();
    const stopped = await page.evaluate(() => window.desktop.remoteAction({ type: 'screenshot' }));
    assert.equal(stopped.isError, true);
    console.log('PASS: stop disables subsequent remote tools.');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
