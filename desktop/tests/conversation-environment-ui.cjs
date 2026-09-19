const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage();
await page.addInitScript(scenario=>{
  const cwd='D:\\Workspace2026\\my-agent-plantform';
  const projectId=scenario==='remote'?'project-a':cwd;
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeProjectId:projectId,projects:scenario==='local'?[{id:projectId,name:'Local',path:cwd,environment:'local',git:{isRepository:false}}]:[],activeThreadId:'a',threads:[{id:'a',projectId,cwd,title:'新对话',messages:[],status:'idle',updatedAt:''}]}));window.__calls=[];
  window.desktop={workspaceGit:async input=>{window.__gitCalls=(window.__gitCalls||0)+1;if(window.__holdGit)await new Promise(resolve=>window.__releaseGit=resolve);if(window.__gitFail)return {ok:false,error:'Git unavailable'};return {ok:true,result:{root:input.root,branch:'feature/test',files:[{path:'sample.ts',index:' ',working:'M',untracked:false}]}};},listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   window.__calls.push({method,params});
   if(method==='thread/start'){if(params.projectId && params.projectId!=='project-a')return{ok:false,error:`project not found: ${params.projectId}`};if(window.__hold)await new Promise(resolve=>window.__release=resolve);return{ok:true,result:window.__created}};
   if(method==='turn/start')return{ok:true,result:{turn:{id:'turn',status:'inProgress'}}};
   if(method==='thread/resume')return{ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   return{ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 },'local');

 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:15439');

 const env=page.getByRole('button',{name:'会话环境',exact:true});
 await env.waitFor();assert.equal(await page.evaluate(()=>window.__gitCalls||0),0);
 await env.click();await page.getByText('分支：feature/test',{exact:true}).waitFor();
 assert.ok(await page.getByText('变更：1 个文件',{exact:true}).isVisible());
 await page.evaluate(()=>window.__gitFail=true);await page.getByRole('button',{name:'刷新环境',exact:true}).click();
 await page.getByRole('alert').getByText('Git unavailable',{exact:true}).waitFor();
 assert.equal(await page.getByText('分支：feature/test',{exact:true}).count(),0);
 await page.evaluate(()=>window.__gitFail=false);await page.getByRole('button',{name:'刷新环境',exact:true}).click();
 await page.getByText('分支：feature/test',{exact:true}).waitFor();
 await page.getByRole('button',{name:'打开 Git 变更',exact:true}).click();
 await page.keyboard.press('Escape');await page.getByRole('region',{name:'Git 变更',exact:true}).waitFor();
 await page.getByRole('button',{name:'关闭 Git 面板',exact:true}).click();
 await env.click();await page.getByText('分支：feature/test',{exact:true}).waitFor();
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('region',{name:'当前会话环境'}).count(),0);
 await page.evaluate(()=>window.__holdGit=true);await env.click();await page.waitForFunction(()=>!!window.__releaseGit);await page.keyboard.press('Escape');await page.evaluate(()=>{window.__holdGit=false;window.__releaseGit();});await env.click();await page.getByText('分支：feature/test',{exact:true}).waitFor();await page.keyboard.press('Escape');
 console.log('PASS: environment loads on demand, shows real snapshot, retries errors and opens Git panel');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
