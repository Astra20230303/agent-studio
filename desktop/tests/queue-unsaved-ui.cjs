const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { TurnQueue } = await import('/src/TurnQueuePanel.tsx');
      const host = document.createElement('div'); document.body.replaceChildren(host);
      const root = ReactDOM.createRoot(host);
      window.__a = { id: 'a', localId: 'thread-a', threadId: 'remote-a', text: 'A', model: 'test', effort: 'low', plugins: [], status: 'paused' };
      window.__b = { ...window.__a, id: 'b', localId: 'thread-b', threadId: 'remote-b', text: 'B' };
      window.__saved = []; window.__resumed = 0;
      window.__renderQueue = items => root.render(React.createElement(TurnQueue, {
        items, disabled: false, onRemove: () => {}, onPause: () => {}, onMove: () => {},
        onResume: () => window.__resumed++, onBeginEdit: () => true,
        onEdit: (...args) => { window.__saved.push(args); return !window.__failSave; },
      }));
      window.__renderQueue([window.__a]);
    });
    const editor=page.getByRole('dialog',{name:'编辑排队消息',exact:true});
    const open=page.getByRole('button',{name:'编辑排队消息：A',exact:true});
    const warning=page.getByRole('alert',{name:'未保存的排队修改',exact:true});
    await open.click();
    await page.keyboard.press('Escape');await editor.waitFor({state:'detached'});
    await open.click();
    await editor.getByRole('textbox').fill('unsaved text');
    await page.keyboard.press('Escape');await warning.waitFor();
    assert.equal(await editor.getByRole('textbox').inputValue(),'unsaved text');
    assert.equal(await warning.getByRole('button',{name:'继续编辑',exact:true}).evaluate(node=>node===document.activeElement),true);
    await warning.getByRole('button',{name:'继续编辑',exact:true}).click();
    assert.equal(await editor.getByRole('textbox').evaluate(node=>node===document.activeElement),true);
    await editor.getByRole('textbox').fill('A');
    await editor.getByRole('button',{name:'取消编辑',exact:true}).click();await editor.waitFor({state:'detached'});
    for(const [label,value] of [['排队消息推理强度','high'],['排队消息执行模式','plan']]) {
      await open.click();await editor.getByRole('combobox',{name:label,exact:true}).selectOption(value);
      await editor.getByRole('button',{name:'取消编辑',exact:true}).click();await warning.waitFor();
      await page.keyboard.press('Escape');await warning.waitFor({state:'detached'});
      assert.equal(await editor.getByRole('textbox').evaluate(node=>node===document.activeElement),true);
      assert.equal(await editor.getByRole('combobox',{name:label,exact:true}).inputValue(),value);
      await editor.getByRole('button',{name:'取消编辑',exact:true}).click();
      await warning.getByRole('button',{name:'放弃排队修改',exact:true}).click();await editor.waitFor({state:'detached'});
    }
    assert.deepEqual(await page.evaluate(()=>window.__saved),[]);
    await open.click();await editor.getByRole('textbox').fill('saved text');
    await page.evaluate(()=>{window.__failSave=true;});
    await editor.getByRole('button',{name:'保存排队消息',exact:true}).click();
    await editor.getByRole('alert').waitFor();
    await page.keyboard.press('Escape');await warning.waitFor();
    await warning.getByRole('button',{name:'继续编辑',exact:true}).click();
    assert.equal(await editor.getByRole('textbox').inputValue(),'saved text');
    await page.evaluate(()=>{window.__failSave=false;});
    await editor.getByRole('button',{name:'保存排队消息',exact:true}).click();await editor.waitFor({state:'detached'});
    assert.equal(await warning.count(),0);
    assert.equal(await page.evaluate(()=>window.__saved[0][1]),'saved text');
    console.log('PASS: dirty queue edits require explicit discard, Escape returns to editing, reverted drafts and successful saves close directly');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
