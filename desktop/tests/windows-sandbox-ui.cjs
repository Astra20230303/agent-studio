const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  const notifications=new Set();window.__notify=event=>notifications.forEach(fn=>fn(event));window.__calls=[];
  window.desktop={platform:'win32',listModels:async()=>({ok:true,models:['test']})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{window.__calls.push({method,params});return {ok:true,result:method==='windowsSandbox/readiness'?{status:'notConfigured'}:method==='windowsSandbox/setupStart'?{started:true}:{data:[]}};},onNotification:fn=>{notifications.add(fn);return()=>notifications.delete(fn);},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'权限',exact:true}).click();
 await page.getByText('状态：尚未配置',{exact:true}).waitFor();
 await page.getByRole('combobox',{name:'沙箱安装模式',exact:true}).selectOption('unelevated');
 await page.getByRole('button',{name:'设置 Windows 沙箱',exact:true}).click();
 await page.getByText('沙箱设置进行中，等待服务端完成通知…',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'设置 Windows 沙箱',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'常规',exact:true}).click();await page.getByRole('button',{name:'权限',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'设置 Windows 沙箱',exact:true}).isDisabled(),true);
 await page.evaluate(()=>window.__notify({method:'windowsSandbox/setupCompleted',params:{mode:'unelevated',success:false,error:'Setup failed'}}));
 await page.getByText('Setup failed',{exact:true}).waitFor();
 await page.getByRole('button',{name:'设置 Windows 沙箱',exact:true}).click();
 await page.evaluate(()=>window.__notify({method:'windowsSandbox/setupCompleted',params:{mode:'elevated',success:true,error:null}}));
 await page.getByText('沙箱设置已完成。重新连接服务后刷新状态；已有会话权限请单独核对。',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__calls.filter(x=>x.method==='windowsSandbox/setupStart').map(x=>x.params.mode)),['unelevated','elevated']);
 console.log('PASS: readiness, async setup, settings navigation retention, failure retry and completion');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
