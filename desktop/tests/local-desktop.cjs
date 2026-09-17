const { _electron: electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const { LocalDesktop, keySequence } = require('../electron/local-desktop.cjs');
(async () => {
  assert.equal(keySequence('Control+a'), '^a');
  for (const key of ['Meta', 'Win', 'Windows']) assert.equal(keySequence(key), '^{ESC}');
  assert.throws(() => keySequence('run;bad'));
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [path.resolve(__dirname,'../electron/main.cjs')], env });
  const local = new LocalDesktop();
  try {
    const point = await app.evaluate(async ({ BrowserWindow, screen }) => {
      const win = new BrowserWindow({ x: 150, y: 150, width: 500, height: 300, alwaysOnTop: true, webPreferences: { contextIsolation: true, sandbox: true } });
      await win.loadURL('data:text/html,<body style="margin:0"><input id="field" style="position:absolute;left:30px;top:30px;width:300px;height:40px" placeholder="Felix local input test"></body>');
      win.show(); win.focus(); globalThis.localTestWindow = win;
      const bounds = win.getContentBounds();
      return screen.dipToScreenPoint({ x: bounds.x+100, y: bounds.y+50 });
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const shot = await local.run({ type: 'connect' });
    assert.ok(shot.content[1].data.length > 1000);
    const f = local.frame;
    const x = (point.x-f.left)*f.imageWidth/f.width, y = (point.y-f.top)*f.imageHeight/f.height;
    await local.run({type:'click',x,y});
    assert.equal(await app.evaluate(() => globalThis.localTestWindow.webContents.executeJavaScript('document.activeElement.id')), 'field');
    await local.run({type:'type',text:'Felix local test 123'});
    assert.equal(await app.evaluate(() => globalThis.localTestWindow.webContents.executeJavaScript('document.querySelector("input").value')), 'Felix local test 123');
    await local.run({type:'key',key:'Control+a'});
    await local.run({type:'type',text:'OK \u4e2d\u6587'});
    assert.equal(await app.evaluate(() => globalThis.localTestWindow.webContents.executeJavaScript('document.querySelector("input").value')), 'OK \u4e2d\u6587');
    await local.run({type:'disconnect'});
    await assert.rejects(local.run({type:'click',x,y}), /stopped/);
    console.log('PASS: real Windows capture, scaled click, text, Ctrl+A and stop.');
  } finally { local.stop(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
