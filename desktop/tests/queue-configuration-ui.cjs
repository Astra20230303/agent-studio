const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'A', messages: [], status: 'running', updatedAt: new Date().toISOString() }] }));
      window.__sent = []; window.__live = 'initial'; window.__interrupts = 0;

      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test','alternate'], effortCapabilities:[{model:'alternate',values:['high']}] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'turn/interrupt') window.__interrupts++;
          if (method === 'thread/resume') return { ok: true, result: { thread: { id: params.threadId, turns: [{ id: window.__live, status: 'inProgress', items: [] }] } } };
          if (method === 'turn/start') {
            window.__sent.push(params);
            if (window.__reject) return { ok: false, error: 'Rejected' };
            const id = `turn-${window.__sent.length}`; window.__live = id;
            window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id, status: 'inProgress' } } });
            if (window.__failImmediately) window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id, status: 'failed', error: { message: 'Immediate failure' } } } });
            return { ok: true, result: { turn: { id, status: 'inProgress' } } };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__notify = fn; return () => {}; }, onClosed: fn => { window.__close = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const add = page.getByRole('button', { name: '本轮完成后发送', exact: true });
    await add.waitFor();
    await input.fill('Configure this queued turn'); await add.click();
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t=>t.id==='a'));
    const open=page.getByRole('button',{name:'编辑排队消息：Configure this queued turn',exact:true});
    await open.click();
    const editor=page.getByRole('dialog',{name:'编辑排队消息',exact:true});
    const model=editor.getByRole('combobox',{name:'排队消息模型',exact:true});
    const effort=editor.getByRole('combobox',{name:'排队消息推理强度',exact:true});
    const save=editor.getByRole('button',{name:'保存排队消息',exact:true});
    await model.selectOption('alternate');
    assert.equal(await save.isDisabled(),true);
    await effort.selectOption('high');
    await editor.getByRole('button',{name:'取消编辑',exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].model),'test');
    await open.click();
    assert.equal(await model.inputValue(),'test');
    await model.selectOption('alternate');await effort.selectOption('high');
    await page.evaluate(()=>{
      const original=Storage.prototype.setItem;
      window.__quota=true;
      Storage.prototype.setItem=function(key,value){if(key==='felix-turn-queue-v1'&&window.__quota)throw Error('quota');return original.call(this,key,value);};
    });
    await save.click();
    await editor.getByRole('alert').waitFor();
    assert.equal(await model.inputValue(),'alternate');assert.equal(await effort.inputValue(),'high');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].model),'test');
    await page.evaluate(()=>{window.__quota=false;window.__releaseCatalog=[];window.desktop.listModels=()=>new Promise(resolve=>window.__releaseCatalog.push(resolve));window.dispatchEvent(new Event('provider-changed'));});
    await page.waitForFunction(()=>window.__releaseCatalog.length>0);
    assert.equal(await save.isDisabled(),true);
    await page.evaluate(()=>window.__releaseCatalog.forEach(resolve=>resolve({ok:true,models:['test','alternate'],effortCapabilities:[{model:'alternate',values:['high']}]})));
    await page.waitForFunction(()=>!document.querySelector('[aria-label="排队消息模型"]').disabled);
    await save.click();
    await editor.waitFor({state:'detached'});
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0]);
    assert.equal(saved.model,'alternate');assert.equal(saved.effort,'high');assert.equal(saved.status,'paused');
    await open.click();
    await page.evaluate(()=>{window.desktop.listModels=async()=>({ok:false,error:'catalog offline'});window.dispatchEvent(new Event('provider-changed'));});
    await editor.getByText(/catalog offline/).waitFor();
    assert.equal(await model.inputValue(),'alternate');
    assert.equal(await save.isEnabled(),true);
    await editor.getByRole('textbox').fill('Edited while catalog offline');
    await save.click();await editor.waitFor({state:'detached'});
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t=>t.id==='a'));
    assert.equal(after.model,before.model);assert.equal(after.reasoningEffort,before.reasoningEffort);
    await page.evaluate(()=>window.__notify({method:'turn/completed',params:{threadId:'a',turn:{id:'initial',status:'completed'}}}));
    await page.getByRole('button',{name:'继续队列',exact:true}).click();
    await page.waitForFunction(()=>window.__sent.length===1);
    const sent=await page.evaluate(()=>window.__sent[0]);
    assert.equal(sent.model,'alternate');assert.equal(sent.effort,'high');
    assert.equal(sent.input[0].text,'Edited while catalog offline');
    assert.deepEqual(errors,[]);
    console.log('PASS: queue configuration cancel/save preserves thread defaults and sends the edited snapshot');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
