const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
  window.__task={id:'a',name:'Metadata',prompt:'Inspect settings',kind:'agent',providerId:'known',model:'test',reasoningEffort:'high',permission:'read-only',notify:true,notificationPolicy:'failed_runs_only',status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[{id:'r',status:'completed',trigger:'manual',startedAt:'2026-09-18T00:00:00Z',environment:{cwd:'D:/resolved-workspace',providerId:'resolved-provider'},configuration:{name:'Historical name',prompt:'Historical prompt',kind:'agent',model:'historical-model',permission:'read-only',reasoningEffort:'low'}}]};
  window.desktop={listProviders:async()=>[{id:'known',name:'Bound provider',enabled:true}],listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[window.__task]}),taskDetail:async()=>({ok:true,task:window.__task}),onTasksChanged:fn=>{window.__changed=fn;return()=>{};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();await page.getByRole('button',{name:'查看任务 Metadata',exact:true}).click();
 const metadata=page.getByRole('dialog').locator(':scope > .task-metadata');
 await metadata.getByText('Bound provider',{exact:true}).waitFor();await metadata.getByText('高',{exact:true}).waitFor();await metadata.getByText('仅失败时通知',{exact:true}).waitFor();
 await page.evaluate(()=>{delete window.__task.providerId;delete window.__task.reasoningEffort;delete window.__task.notificationPolicy;window.__changed();});
 await metadata.getByText('跟随当前启用渠道',{exact:true}).waitFor();await metadata.getByText('模型默认',{exact:true}).waitFor();await metadata.getByText('完成、失败或中断',{exact:true}).waitFor();
 await page.evaluate(()=>{window.__task.providerId='removed';window.__task.notify=false;window.__task.notificationPolicy='failed_runs_only';window.__changed();});
 await metadata.getByText('removed（不可用）',{exact:true}).waitFor();await metadata.getByText('已关闭',{exact:true}).waitFor();
 await page.evaluate(()=>{window.__task.kind='reminder';window.__changed();});
 await metadata.getByText('模型默认',{exact:true}).waitFor({state:'detached'});
 assert.equal(await metadata.getByText('执行渠道',{exact:true}).count(),0);await metadata.getByText('已关闭',{exact:true}).waitFor();
 await page.locator('.task-run > summary').click();
 await page.getByRole('button',{name:'运行时任务配置',exact:true}).click();
 await page.getByText('historical-model',{exact:true}).waitFor();await page.getByText('Historical prompt',{exact:true}).waitFor();await page.getByText('D:/resolved-workspace',{exact:true}).waitFor();await page.getByText('resolved-provider',{exact:true}).waitFor();
 await page.getByText('跟随运行时启用渠道',{exact:true}).waitFor();
 await page.getByRole('button',{name:'复制运行结果',exact:true}).click();
 const exported=await page.evaluate(()=>window.__copied);assert.ok(exported.startsWith('Historical name\n'));assert.match(exported,/实际执行环境[\s\S]*D:\/resolved-workspace[\s\S]*resolved-provider/);
 console.log('PASS: task detail displays configured provider/effort/notification and handles defaults, unavailable provider and reminder');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
