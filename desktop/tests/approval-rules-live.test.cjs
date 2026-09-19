const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {once}=require('node:events');const {spawn}=require('node:child_process');
const {CodexRpc}=require('../electron/codex-rpc.cjs');
const {findCommand,compatibilityCatalog}=require('../electron/codex-server.cjs');
const {startMiniMaxAdapter}=require('../electron/minimax-adapter.cjs');
const {commandApprovalOptions}=require('../src/approvalDecisions.ts');
const {createServerResponses}=require('../src/serverResponses.ts');
test('real app-server persists a command rule and reuses it after restart',{timeout:60000},async()=>{
 const root=path.resolve(__dirname,'../..');const cache=path.join(root,'.project-cache/tmp');fs.mkdirSync(cache,{recursive:true});
 const profile=fs.mkdtempSync(path.join(cache,'approval-rule-live-'));
 let calls=0,modelError,runIndex=0;
 const model=http.createServer(async(req,res)=>{try{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
  let delta={content:'Rule fixture completed.'};
  if(calls++%2===0){
   const tool=body.tools.find(t=>/(^|__)shell_command$/.test(t.function.name))||body.tools.find(t=>/(^|__)(exec_command|shell)$/.test(t.function.name));assert.ok(tool);
   const command=runIndex===2?'node -e "console.log(73129)"':'python -c "print(73129)"';const props=tool.function.parameters.properties;
   const args=props.cmd?{cmd:command}:{command:props.command.type==='array'?(runIndex===2?['node','-e','console.log(73129)']:['python','-c','print(73129)']):command};
   delta={tool_calls:[{index:0,id:'rule-command-'+calls,type:'function',function:{name:tool.function.name,arguments:JSON.stringify(args)}}]};
  }
  res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:delta.tool_calls?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n');
 }catch(e){modelError=e;res.end();}});
 model.listen(0,'127.0.0.1');await once(model,'listening');
 const adapter=startMiniMaxAdapter({port:0,apiKey:'local-test',upstream:`http://127.0.0.1:${model.address().port}`});await once(adapter,'listening');
 const settings=[`model_catalog_json=${JSON.stringify(compatibilityCatalog(root,profile))}`,'model_providers.minimax.name="MiniMax"','model_providers.minimax.wire_api="responses"',`model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`,'web_search="disabled"'];
 try {for(let run=0;run<3;run++){
  runIndex=run;
  const resolved=findCommand(root);const child=spawn(resolved.command,[...resolved.args,...settings.flatMap(v=>['-c',v]),'app-server','--stdio'],{cwd:profile,windowsHide:true,env:{...process.env,CODEX_HOME:profile}});
  const exited=once(child,'exit');const rpc=new CodexRpc(child);const requests=[],events=[];
  rpc.on('request',m=>requests.push(m));rpc.on('notification',m=>events.push(m));
  const timer=setTimeout(()=>rpc.close(),25000);
  const wait=async predicate=>{const deadline=Date.now()+20000;while(!predicate()){if(modelError)throw modelError;if(rpc.closedError)throw rpc.closedError;if(Date.now()>deadline)throw Error('Timeout '+JSON.stringify({requests,events:events.map(e=>e.method)}));await new Promise(r=>setTimeout(r,25));}};
  try{
   await rpc.request('initialize',{clientInfo:{name:'felix_rule_test',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
   const {thread}=await rpc.request('thread/start',{cwd:profile,model:'gpt-5.4',modelProvider:'minimax',approvalPolicy:'untrusted',sandbox:'danger-full-access'});
   await rpc.request('turn/start',{threadId:thread.id,input:[{type:'text',text:'Run the isolated print fixture.'}]});
   if(run!==1){
    await wait(()=>requests.length>0||events.some(e=>e.method==='turn/completed'));
    assert.equal(requests.length,1,'unmatched command must request approval');
    const request=requests[0];assert.equal(request.method,'item/commandExecution/requestApproval');
    const option=run===2?commandApprovalOptions(request.params).find(o=>o.decision==='cancel'):commandApprovalOptions(request.params).find(o=>typeof o.decision==='object'&&o.decision.acceptWithExecpolicyAmendment);
    assert.ok(option,'server must propose a command rule: '+JSON.stringify(request.params));
    const responses=createServerResponses(async(id,result)=>{rpc.respond(id,result);return{ok:true};});
    await responses.send(request,option.decision);
   }
   await wait(()=>events.some(e=>e.method==='turn/completed'));
   assert.equal(events.find(e=>e.method==='turn/completed').params.turn.status,run===2?'interrupted':'completed');
   const command=events.find(e=>e.method==='item/completed'&&e.params.item.type==='commandExecution')?.params.item;
   assert.ok(command,'command completion expected');if(run===2){assert.equal(command.status,'declined');assert.ok(!command.aggregatedOutput?.includes('73129'));}else{assert.equal(command.exitCode,0);assert.match(command.aggregatedOutput,/73129/);}
   assert.equal(requests.length,run===1?0:1,'saved rule must avoid a new approval after restart');
   const rules=fs.readFileSync(path.join(profile,'rules/default.rules'),'utf8');assert.match(rules,/prefix_rule/);assert.match(rules,/allow/);
  }finally{clearTimeout(timer);rpc.close();await exited;}
 }}finally{adapter.closeAllConnections();await new Promise(r=>adapter.close(r));model.closeAllConnections();await new Promise(r=>model.close(r));}
});
