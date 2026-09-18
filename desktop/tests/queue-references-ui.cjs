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
      localStorage.setItem('felix-attachments-v1', JSON.stringify({ a: ['D:/missing.png', 'D:/keep.png'] }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
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
    await page.addInitScript(()=>{
      localStorage.setItem('felix-turn-queue-v1',JSON.stringify([{id:'q',localId:'a',threadId:'a',text:'Queued tools',model:'test',effort:'low',status:'paused',skills:[{name:'Remove skill',path:'D:/remove/SKILL.md'},{name:'Keep skill',path:'D:/keep/SKILL.md'}],plugins:[{id:'remove',name:'Remove plugin'},{id:'keep',name:'Keep plugin'}]}]));
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const open=page.getByRole('button',{name:'编辑排队消息：Queued tools',exact:true});
    const editor=page.getByRole('dialog',{name:'编辑排队消息',exact:true});
    const save=editor.getByRole('button',{name:'保存排队消息',exact:true});
    await open.click();
    await editor.getByRole('textbox').fill('');
    await editor.getByRole('button',{name:'移除排队技能：D:/remove/SKILL.md',exact:true}).click();
    assert.equal(await save.isEnabled(),true);
    await editor.getByRole('button',{name:'移除排队技能：D:/keep/SKILL.md',exact:true}).click();
    assert.equal(await save.isDisabled(),true);
    await editor.getByRole('button',{name:'移除排队插件：remove',exact:true}).click();
    await editor.getByRole('button',{name:'取消编辑',exact:true}).click();
    await open.click();
    assert.equal(await editor.getByRole('textbox').inputValue(),'Queued tools');
    await editor.getByRole('button',{name:'移除排队技能：D:/remove/SKILL.md',exact:true}).click();
    await editor.getByRole('button',{name:'移除排队插件：remove',exact:true}).click();
    await page.evaluate(()=>{
      const original=Storage.prototype.setItem;window.__failQueueSave=true;
      Storage.prototype.setItem=function(key,value){if(key==='felix-turn-queue-v1'&&window.__failQueueSave)throw Error('quota');return original.call(this,key,value);};
    });
    await save.click();await editor.getByRole('alert').waitFor();
    assert.equal(await editor.getByRole('button',{name:'移除排队技能：D:/remove/SKILL.md',exact:true}).count(),0);
    assert.equal(await editor.getByRole('button',{name:'移除排队插件：remove',exact:true}).count(),0);
    const unchanged=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0]);
    assert.equal(unchanged.skills.length,2);assert.equal(unchanged.plugins.length,2);
    await page.evaluate(()=>{window.__failQueueSave=false;});
    await save.click();await editor.waitFor({state:'detached'});
    const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0]);
    assert.deepEqual(snapshot.skills,[{name:'Keep skill',path:'D:/keep/SKILL.md'}]);
    assert.deepEqual(snapshot.plugins,[{id:'keep',name:'Keep plugin'}]);
    await page.getByText('插件：Keep plugin',{exact:true}).waitFor();
    assert.equal(await page.getByText('插件：Remove plugin',{exact:true}).count(),0);
    await page.evaluate(()=>window.__notify({method:'turn/completed',params:{threadId:'a',turn:{id:'initial',status:'completed'}}}));
    await page.getByRole('button',{name:'继续队列',exact:true}).click();
    await page.waitForFunction(()=>window.__sent.length===1);
    const sent=await page.evaluate(()=>window.__sent[0].input);
    assert.deepEqual(sent.filter(item=>item.type==='skill'),[{type:'skill',name:'Keep skill',path:'D:/keep/SKILL.md'}]);
    assert.deepEqual(sent.filter(item=>item.type==='mention'),[{type:'mention',name:'Keep plugin',path:'plugin://keep'}]);
    console.log('PASS: queued skill/plugin removals cancel safely, validate remaining content and send only retained references');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
