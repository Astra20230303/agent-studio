const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { createServerResponses } = require('../src/serverResponses.ts');


for (const scope of ['turn', 'session']) test(`real permission grant ${scope} has correct cross-turn lifetime`, {timeout:30000}, async () => {
  const root=path.resolve(__dirname,'../..');
  const cache=path.join(root,'.project-cache/tmp');fs.mkdirSync(cache,{recursive:true});
  const profile=fs.mkdtempSync(path.join(cache,'permission-scope-live-'));
  const workspace=fs.mkdtempSync(path.join(cache,'permission-scope-workspace-'));
  let target=path.join(workspace,'approved.txt');
  let calls=0, modelError;
  const model=http.createServer(async(req,res)=>{
    try {
      let raw='';for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw);res.writeHead(200,{'content-type':'text/event-stream'});
      let delta;
      const index=calls++;
      if(index===0){
        const tool=body.tools.find(tool=>/(^|__)request_permissions$/.test(tool.function.name));
        assert.ok(tool,'request_permissions must be advertised');
        delta={tool_calls:[{index:0,id:'permission-call',type:'function',function:{name:tool.function.name,arguments:JSON.stringify({reason:'Allow fixture writes',permissions:{file_system:{write:[workspace]}}})}}]};
      }else if(index===2||index===4){
        const tool=body.tools.find(tool=>/(^|__)apply_patch$/.test(tool.function.name));
        assert.ok(tool,'apply_patch must be advertised');
        const patch='*** Begin Patch\n*** Add File: '+target.replaceAll('\\','/')+'\n+approved content\n*** End Patch';
        const props=tool.function.parameters.properties;
        const args=props.input?{input:patch}:{patch};
        delta={tool_calls:[{index:0,id:'file-approval-call',type:'function',function:{name:tool.function.name,arguments:JSON.stringify(args)}}]};
      }else delta={content:'Finished file approval fixture.'};
      res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:delta.tool_calls?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n');
    }catch(error){modelError=error;res.end();}
  });
  model.listen(0,'127.0.0.1');await once(model,'listening');
  const adapter=startMiniMaxAdapter({port:0,apiKey:'local-test',upstream:`http://127.0.0.1:${model.address().port}`});await once(adapter,'listening');
  const settings=[`model_catalog_json=${JSON.stringify(compatibilityCatalog(root,profile))}`,'model_providers.minimax.name="MiniMax"','model_providers.minimax.wire_api="responses"',`model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`,'web_search="disabled"','features.request_permissions_tool=true'];
  const child=spawn(findCommand(root).command,[...settings.flatMap(v=>['-c',v]),'app-server','--stdio'],{cwd:profile,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,CODEX_HOME:profile}});
  const rpc=new CodexRpc(child);const notifications=[];const requests=[];
  rpc.on('notification',message=>notifications.push(message));
  rpc.on('request',message=>requests.push(message));
  const wait=async(predicate)=>{const end=Date.now()+15000;while(!predicate()){if(modelError)throw modelError;if(rpc.closedError)throw rpc.closedError;if(Date.now()>end)throw Error('Timed out: '+JSON.stringify({requests,events:notifications.map(n=>n.method)}));await new Promise(r=>setTimeout(r,25));}};
  const timer=setTimeout(()=>rpc.close(),25000);
  try {
    await rpc.request('initialize',{clientInfo:{name:'felix_file_approval_acceptance',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
    const {thread}=await rpc.request('thread/start',{cwd:workspace,model:'gpt-5.4',modelProvider:'minimax',approvalPolicy:'on-request',sandbox:'read-only'});
    await rpc.request('turn/start',{threadId:thread.id,input:[{type:'text',text:'Request fixture write permissions.'}]});
    await wait(()=>requests.length>0);
    const request=requests[0];assert.equal(request.method,'item/permissions/requestApproval');
    const responses=createServerResponses(async(id,result)=>{rpc.respond(id,result);return {ok:true};});
    await responses.send(request,scope==='session'?'acceptForSession':'accept');
    await wait(()=>notifications.some(n=>n.method==='turn/completed'));
    assert.equal(notifications.find(n=>n.method==='turn/completed').params.turn.status,'completed');
    assert.equal(fs.existsSync(target),false);
    notifications.length=0;requests.length=0;
    await rpc.request('turn/start',{threadId:thread.id,input:[{type:'text',text:'Now write the isolated fixture file.'}]});
    if(scope==='turn'){
      await wait(()=>requests.length>0||notifications.some(n=>n.method==='turn/completed'));
      assert.equal(requests.length,1,'turn permission must expire before the next turn');
      assert.equal(requests[0].method,'item/fileChange/requestApproval');
      await responses.send(requests[0],'decline');
    }
    await wait(()=>notifications.some(n=>n.method==='turn/completed'));
    assert.equal(notifications.find(n=>n.method==='turn/completed').params.turn.status,'completed');
    assert.equal(requests.length,scope==='session'?0:1);
    assert.equal(fs.existsSync(target),scope==='session');
    if(scope==='session')assert.equal(fs.readFileSync(target,'utf8'),'approved content\n');
    if(scope==='session'){
      target=path.join(workspace,'other-thread.txt');notifications.length=0;requests.length=0;
      const other=await rpc.request('thread/start',{cwd:workspace,model:'gpt-5.4',modelProvider:'minimax',approvalPolicy:'on-request',sandbox:'read-only'});
      await rpc.request('turn/start',{threadId:other.thread.id,input:[{type:'text',text:'Write the new conversation fixture.'}]});
      await wait(()=>requests.length>0||notifications.some(n=>n.method==='turn/completed'));
      assert.equal(requests.length,1,'session grant must not leak into another thread');
      assert.equal(requests[0].method,'item/fileChange/requestApproval');
      assert.equal(requests[0].params.threadId,other.thread.id);
      await responses.send(requests[0],'decline');
      await wait(()=>notifications.some(n=>n.method==='turn/completed'));
      assert.equal(fs.existsSync(target),false);
    }

  }finally{
    clearTimeout(timer);const exited=child.exitCode===null?once(child,'exit').catch(()=>{}):Promise.resolve();rpc.close();await exited;
    adapter.closeAllConnections();await new Promise(r=>adapter.close(r));model.closeAllConnections();await new Promise(r=>model.close(r));
  }
});
