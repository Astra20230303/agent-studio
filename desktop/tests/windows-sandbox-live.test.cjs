const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const {once}=require('node:events');
const {CodexRpc}=require('../electron/codex-rpc.cjs');const {findCommand,compatibilityCatalog}=require('../electron/codex-server.cjs');
test('Windows restricted-token sandbox allows workspace writes and denies outside writes',{skip:process.platform!=='win32',timeout:45000},async()=>{
 const root=path.resolve(__dirname,'../..');const cache=path.join(root,'.project-cache/tmp');fs.mkdirSync(cache,{recursive:true});
 const fixture=fs.mkdtempSync(path.join(cache,'sandbox-enforcement-'));const profile=path.join(fixture,'profile');const workspace=path.join(fixture,'workspace');const outside=path.join(fixture,'outside');
 for(const dir of [profile,workspace,outside])fs.mkdirSync(dir);
 const settings=['windows.sandbox="unelevated"',`model_catalog_json=${JSON.stringify(compatibilityCatalog(root,profile))}`,'model_providers.minimax.name="MiniMax"','model_providers.minimax.wire_api="responses"','model_providers.minimax.base_url="http://127.0.0.1:1/v1"','web_search="disabled"'];
 const resolved=findCommand(root);const child=spawn(resolved.command,[...resolved.args,...settings.flatMap(value=>['-c',value]),'app-server','--stdio'],{cwd:workspace,windowsHide:true,env:{...process.env,CODEX_HOME:profile}});
 const exited=once(child,'exit');const rpc=new CodexRpc(child);const timer=setTimeout(()=>rpc.close(),35000);
 const quote=text=>"'"+text.replace(/'/g,"''")+"'";
 try{
  await rpc.request('initialize',{clientInfo:{name:'sandbox_enforcement',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
  assert.equal((await rpc.request('windowsSandbox/readiness',{})).status,'ready');
  const policy={type:'workspaceWrite',writableRoots:[workspace],networkAccess:false,excludeTmpdirEnvVar:true,excludeSlashTmp:true};
  const execute=(target,sandboxPolicy=policy)=>rpc.request('command/exec',{command:['powershell.exe','-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop'; Set-Content -LiteralPath ${quote(target)} -Value 'sandbox marker'; Write-Output 'WRITE_OK'`],cwd:workspace,timeoutMs:15000,sandboxPolicy});
  const allowed=await execute(path.join(workspace,'allowed.txt'));
  assert.equal(allowed.exitCode,0,JSON.stringify(allowed));assert.match(fs.readFileSync(path.join(workspace,'allowed.txt'),'utf8'),/sandbox marker/);
  await assert.rejects(execute(path.join(outside,'denied.txt')),/sandbox denied exec error/);
  assert.equal(fs.existsSync(path.join(outside,'denied.txt')),false);
  await assert.rejects(execute(path.join(workspace,'readonly-denied.txt'),{type:'readOnly',networkAccess:false}),/sandbox denied exec error/);
  assert.equal(fs.existsSync(path.join(workspace,'readonly-denied.txt')),false);
  const completed=new Promise((resolve,reject)=>{
   const listener=event=>{if(event.method==='windowsSandbox/setupCompleted'){rpc.off('notification',listener);rpc.off('closed',reject);resolve(event.params);}};
   rpc.on('notification',listener);rpc.once('closed',reject);
  });
  completed.catch(()=>{});
  assert.equal((await rpc.request('windowsSandbox/setupStart',{mode:'unelevated',cwd:workspace})).started,true);
  const setup=await completed;assert.equal(setup.success,true,setup.error);assert.equal(setup.mode,'unelevated');
  assert.match(fs.readFileSync(path.join(profile,'config.toml'),'utf8'),/sandbox\s*=\s*"unelevated"/);
  console.log('Verified actual Windows sandbox write boundary, read-only denial and isolated setup persistence');
 }finally{clearTimeout(timer);rpc.close();await exited;}
 const restarted=spawn(resolved.command,[...resolved.args,...settings.filter(value=>!value.startsWith('windows.sandbox=')).flatMap(value=>['-c',value]),'app-server','--stdio'],{cwd:workspace,windowsHide:true,env:{...process.env,CODEX_HOME:profile}});
 const restartedExit=once(restarted,'exit');const persistedRpc=new CodexRpc(restarted);const restartTimer=setTimeout(()=>persistedRpc.close(),10000);
 try{
  await persistedRpc.request('initialize',{clientInfo:{name:'sandbox_persistence',version:'1'},capabilities:{experimentalApi:true}});persistedRpc.notify('initialized',{});
  assert.equal((await persistedRpc.request('windowsSandbox/readiness',{})).status,'ready');
 }finally{clearTimeout(restartTimer);persistedRpc.close();await restartedExit;}
});
