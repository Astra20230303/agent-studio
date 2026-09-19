const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage();
await page.addInitScript(scenario=>{
  const cwd='D:\\Workspace2026\\my-agent-plantform';
  const projectId=scenario==='remote'?'project-a':cwd;
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeProjectId:projectId,projects:scenario==='local'?[{id:projectId,name:'Local',path:cwd,environment:'local',git:{isRepository:false}}]:[],activeThreadId:'a',threads:[{id:'a',remoteId:'parent',projectId,cwd,title:'新对话',messages:[{id:'agent-event',role:'assistant',content:'',tool:{kind:'collabAgentToolCall',status:'completed',collaboration:{tool:'spawnAgent',receiverThreadIds:['child'],agentsStates:{child:{status:'running',message:'Inspecting files'}}}}}],status:'completed',updatedAt:''}]}));window.__calls=[];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   window.__calls.push({method,params});
   if(params?.threadId==='child'){if(method==='thread/read')return{ok:true,result:{thread:{id:'child',status:{type:'idle'}}}};if(method==='thread/turns/list')return{ok:true,result:{data:[{id:'child-turn',status:'failed',error:{message:'Build failed'},items:[]}]}};if(method==='turn/start'&&window.__failAgent)return{ok:false,error:'Send failed'};}

   if(method==='thread/start'){if(params.projectId && params.projectId!=='project-a')return{ok:false,error:`project not found: ${params.projectId}`};if(window.__hold)await new Promise(resolve=>window.__release=resolve);return{ok:true,result:window.__created}};
   if(method==='turn/start')return{ok:true,result:{turn:{id:'turn',status:'inProgress'}}};
   if(method==='thread/resume')return{ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   return{ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 },'local');


 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:15439');await page.getByRole('button',{name:'更多会话操作',exact:true}).click();await page.getByRole('button',{name:'查看多 Agent 协作',exact:true}).click();await page.keyboard.press('Escape');
 const panel=page.getByRole('complementary',{name:'多 Agent 协作',exact:true});await panel.waitFor();
 await panel.getByText('Inspecting files',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'刷新状态与结果'}).click();await panel.getByText('Build failed',{exact:true}).waitFor();
 const input=panel.getByRole('textbox',{name:'追加指令 child'});await input.fill('Fix the build');
 await page.evaluate(()=>window.__failAgent=true);await panel.getByRole('button',{name:'发送追加指令'}).click();await panel.getByRole('alert').getByText('Send failed').waitFor();assert.equal(await input.inputValue(),'Fix the build');
 await page.evaluate(()=>window.__failAgent=false);await panel.getByRole('button',{name:'发送追加指令'}).click();await panel.getByText('已启动子任务后续回合',{exact:true}).waitFor();assert.equal(await input.inputValue(),'');
 assert.ok((await page.evaluate(()=>window.__calls)).some(c=>c.method==='turn/start'&&c.params.threadId==='child'&&c.params.input[0].text==='Fix the build'));
 await panel.getByRole('button',{name:'停止子任务'}).click();await panel.getByText('子任务已结束，无需停止',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'打开子会话'}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(t=>t.remoteId==='child'));
 console.log('PASS: collaboration panel groups child records, refreshes errors, retries instructions without losing draft and navigates to child');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
