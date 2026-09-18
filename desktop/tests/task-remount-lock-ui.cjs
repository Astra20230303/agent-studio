const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  window.__calls=[];
  window.__task={id:'a',name:'Persistent lock',prompt:'Test',kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[]};
  window.desktop={listTasks:async()=>({ok:true,tasks:[window.__task]}),taskDetail:async()=>({ok:true,task:window.__task}),
   setTaskStatus:(...args)=>{window.__calls.push(args);return new Promise(resolve=>window.__finish=resolve)},
   runTask:async()=>{window.__runCalls=(window.__runCalls||0)+1;return{ok:true}}
  };
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 const open=()=>page.getByRole('button',{name:'已安排',exact:true}).click();
 await open();await page.getByRole('button',{name:'暂停 Persistent lock',exact:true}).click();
 await page.waitForFunction(()=>window.__calls.length===1);
 await page.getByRole('button',{name:'插件',exact:true}).click();await open();
 await page.getByRole('button',{name:'暂停 Persistent lock',exact:true}).click();
 await page.getByText('此任务的操作尚未完成，请稍后重试。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__calls.length),1);
 await page.getByRole('button',{name:'运行 Persistent lock',exact:true}).click();
 await page.getByText('此任务的操作尚未完成，请稍后重试。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__runCalls||0),0);
 await page.evaluate(()=>window.__finish({ok:false,error:'Failed pending request'}));
 await page.getByRole('button',{name:'暂停 Persistent lock',exact:true}).click();await page.waitForFunction(()=>window.__calls.length===2);
 await page.evaluate(()=>{window.__task.status='paused';window.__finish({ok:true})});
 await page.getByRole('button',{name:'恢复 Persistent lock',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(item=>item.action==='暂停任务').length),1);
 console.log('PASS: task lock survives page remount, blocks cross-operation duplicate and permits retry after failure');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
