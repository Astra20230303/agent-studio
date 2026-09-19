const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model:'test', activeThreadId:'a', threads:[{id:'a',remoteId:'a',title:'Queue a',messages:[],status:'completed',updatedAt:new Date().toISOString()}] }));
   window.__item = {id:'q',clientUserMessageId:'client',input:[{type:'text',text:'original'},{type:'localImage',path:'C:/picture.png'},{type:'skill',name:'test',path:'C:/skill'}]};
   window.__updates=[]; window.__fail=true;
   window.desktop={listModels:async()=>({ok:true,models:['test']})};
   window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async(method,params)=>{
    if(method==='thread/resume')return {ok:true,result:{thread:{id:'a',turns:[]}}};
    if(method==='thread/queue/list')return {ok:true,result:{data:[structuredClone(window.__item)]}};
    if(method==='thread/queue/update') {window.__updates.push(params);if(window.__fail)return {ok:false,error:'write failed'};window.__item.input=params.input;return {ok:true,result:{queuedSubmission:structuredClone(window.__item)}};}
    return {ok:true,result:{data:[]}};
   },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  const panel=page.getByRole('region',{name:'服务端排队消息',exact:true});
  await panel.getByRole('button',{name:'编辑服务端消息 q',exact:true}).click();
  const input=panel.getByRole('textbox',{name:'排队文本 1',exact:true});
  await input.fill('updated');
  await panel.getByRole('button',{name:'保存编辑',exact:true}).click();
  await panel.getByText(/write failed/).waitFor();
  assert.equal(await input.inputValue(),'updated');
  await page.evaluate(()=>{window.__fail=false;});
  await panel.getByRole('button',{name:'保存编辑',exact:true}).click();
  await panel.getByText('排队消息已保存',{exact:true}).waitFor();
  await input.waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>window.__item.input),[{type:'text',text:'updated',text_elements:[]},{type:'localImage',path:'C:/picture.png'},{type:'skill',name:'test',path:'C:/skill'}]);
  await panel.getByRole('button',{name:'编辑服务端消息 q',exact:true}).click();
  await input.fill('conflicting draft');
  await page.evaluate(()=>{window.__item.input[0].text='other client change';});
  await panel.getByRole('button',{name:'保存编辑',exact:true}).click();
  await panel.getByText(/消息已被修改或移出队列/).waitFor();
  assert.equal(await input.inputValue(),'conflicting draft');
  assert.equal(await page.evaluate(()=>window.__updates.length),2);
  assert.deepEqual(errors,[]);
  console.log('PASS: queue edit preserves attachments, retains failed drafts and detects remote edits');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
