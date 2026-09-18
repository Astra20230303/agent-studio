const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const mode of ['starting','syncing','failure']){
  const page=await browser.newPage();
  await page.addInitScript(mode=>{
   localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',title:'新对话',status:'idle',messages:[],updatedAt:''}]}));
   window.__names=[];window.__turns=0;
   window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
   window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
    if(method==='thread/start'){
     if(mode==='starting')await new Promise(resolve=>window.__releaseStart=resolve);
     return{ok:true,result:{thread:{id:'remote-a'}}};
    }
    if(method==='thread/name/set'){
     window.__names.push(params.name);
     if(window.__names.length===1){
      if(mode==='failure')return{ok:false,error:{message:'Title sync failed'}};
      if(mode==='syncing')await new Promise(resolve=>window.__releaseTitle=resolve);
     }
     return{ok:true,result:{}};
    }
    if(method==='turn/start'){window.__turns++;return{ok:true,result:{turn:{id:'turn',status:'inProgress'}}};}
    return{ok:true,result:method==='thread/resume'?{thread:{id:params.threadId,turns:[]}}:{data:[]}};
   },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
  },mode);
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'选择模型',exact:true}).getByText('test',{exact:true}).waitFor();
  await page.getByRole('textbox',{name:'消息',exact:true}).fill('Automatic title');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  if(mode==='starting')await page.waitForFunction(()=>!!window.__releaseStart);
  else await page.waitForFunction(()=>window.__turns===1);
  await page.keyboard.press('Control+Shift+P');
  await page.getByRole('combobox',{name:'搜索命令',exact:true}).fill('重命名当前会话');
  await page.getByRole('option',{name:'重命名当前会话',exact:true}).click();
  const input=page.getByRole('textbox',{name:'会话名称',exact:true});await input.fill('My chosen title');
  const save=page.getByRole('button',{name:'保存名称',exact:true});await save.click();
  if(mode==='syncing'){
   await page.getByText('此会话的操作尚未完成，请稍后重试。',{exact:true}).waitFor();
   assert.equal(await input.inputValue(),'My chosen title');
   assert.deepEqual(await page.evaluate(()=>window.__names),['Automatic title']);
   await page.evaluate(()=>window.__releaseTitle());await save.click();
  }
  await page.getByRole('dialog',{name:'重命名会话',exact:true}).waitFor({state:'hidden'});
  if(mode==='starting'){await page.evaluate(()=>window.__releaseStart());await page.waitForFunction(()=>window.__turns===1)}
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].title==='My chosen title');
  assert.deepEqual(await page.evaluate(()=>window.__names),mode==='starting'?['My chosen title']:['Automatic title','My chosen title']);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].titleSource),'manual');
  assert.equal(await page.evaluate(()=>window.__turns),1);await page.close();
 }
 console.log('PASS: startup rename, pending automatic sync, failure recovery and uninterrupted turn send');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
