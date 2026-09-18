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
const { applyToolEvent } = require('../src/toolActivity.ts');
const { approvalFileChanges } = require('../src/approvalFileChanges.ts');

test('real file approval exposes the pending patch before acceptance and writes only after approval', {timeout:30000}, async () => {
  const root=path.resolve(__dirname,'../..');
  const cache=path.join(root,'.project-cache/tmp');fs.mkdirSync(cache,{recursive:true});
  const profile=fs.mkdtempSync(path.join(cache,'file-approval-live-'));
  const workspace=fs.mkdtempSync(path.join(cache,'file-approval-workspace-'));
  const target=path.join(workspace,'approved.txt');
  let calls=0, modelError;
  const model=http.createServer(async(req,res)=>{
    try {
      let raw='';for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw);res.writeHead(200,{'content-type':'text/event-stream'});
      let delta;
      if(calls++===0){
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
  const settings=[`model_catalog_json=${JSON.stringify(compatibilityCatalog(root,profile))}`,'model_providers.minimax.name="MiniMax"','model_providers.minimax.wire_api="responses"',`model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`,'web_search="disabled"'];
  const child=spawn(findCommand(root).command,[...settings.flatMap(v=>['-c',v]),'app-server','--stdio'],{cwd:profile,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,CODEX_HOME:profile}});
  const rpc=new CodexRpc(child);const notifications=[];const requests=[];
  const local={remoteId:'',messages:[]};
  rpc.on('notification',message=>{notifications.push(message);if(message.params?.threadId===local.remoteId)applyToolEvent(local,message.method,message.params);});
  rpc.on('request',message=>requests.push(message));
  const wait=async(predicate)=>{const end=Date.now()+15000;while(!predicate()){if(modelError)throw modelError;if(rpc.closedError)throw rpc.closedError;if(Date.now()>end)throw Error('Timed out: '+JSON.stringify({requests,events:notifications.map(n=>n.method)}));await new Promise(r=>setTimeout(r,25));}};
  const timer=setTimeout(()=>rpc.close(),25000);
  try {
    await rpc.request('initialize',{clientInfo:{name:'felix_file_approval_acceptance',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
    const {thread}=await rpc.request('thread/start',{cwd:workspace,model:'gpt-5.4',modelProvider:'minimax',approvalPolicy:'on-request',sandbox:'read-only'});local.remoteId=thread.id;
    await rpc.request('turn/start',{threadId:thread.id,input:[{type:'text',text:'Apply the supplied patch to the isolated fixture file.'}]});
    await wait(()=>requests.length>0);
    const request=requests[0];assert.equal(request.method,'item/fileChange/requestApproval');
    const changes=approvalFileChanges(request,[local]);
    assert.ok(changes?.length,'pending file changes must be available before approval');
    assert.equal(path.resolve(changes[0].path),target);assert.match(changes[0].diff,/approved content/);
    assert.equal(fs.existsSync(target),false);
    rpc.respond(request.id,{decision:'accept'});
    await wait(()=>notifications.some(n=>n.method==='turn/completed'));
    assert.equal(notifications.find(n=>n.method==='turn/completed').params.turn.status,'completed');
    assert.ok(fs.existsSync(target), JSON.stringify(notifications.filter(n=>n.method==='item/completed'||n.method==='item/fileChange/outputDelta'||n.method==='error')));
    assert.equal(fs.readFileSync(target,'utf8'),'approved content\n');
  }finally{
    clearTimeout(timer);const exited=child.exitCode===null?once(child,'exit').catch(()=>{}):Promise.resolve();rpc.close();await exited;
    adapter.closeAllConnections();await new Promise(r=>adapter.close(r));model.closeAllConnections();await new Promise(r=>model.close(r));
  }
});



