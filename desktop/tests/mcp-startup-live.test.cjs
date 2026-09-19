const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const {once}=require('node:events');
const {CodexRpc}=require('../electron/codex-rpc.cjs');const {findCommand,compatibilityCatalog}=require('../electron/codex-server.cjs');
const {readMcpStartup,mcpStartupText}=require('../src/mcpStartup.ts');
test('real MCP startup failure and recovery notifications match their thread',{timeout:40000},async()=>{
 const root=path.resolve(__dirname,'../..');const cache=path.join(root,'.project-cache/tmp');fs.mkdirSync(cache,{recursive:true});
 const profile=fs.mkdtempSync(path.join(cache,'mcp-startup-live-'));
 const config=healthy=>`[mcp_servers.startup_fixture]\ncommand = ${JSON.stringify(process.execPath)}\nargs = ${JSON.stringify(healthy?[path.join(__dirname,'mcp-live.test.cjs'),'--fixture']:['-e','process.exit(1)'])}\nstartup_timeout_sec = 5\n`;
 fs.writeFileSync(path.join(profile,'config.toml'),config(false));
 const resolved=findCommand(root);const child=spawn(resolved.command,[...resolved.args,'-c',`model_catalog_json=${JSON.stringify(compatibilityCatalog(root,profile))}`,'app-server','--stdio'],{cwd:profile,windowsHide:true,env:{...process.env,CODEX_HOME:profile}});
 const exited=once(child,'exit');const rpc=new CodexRpc(child);const events=[];rpc.on('notification',event=>{if(event.method==='mcpServer/startupStatus/updated')events.push(event.params);});
 const timer=setTimeout(()=>rpc.close(),35000);
 const wait=async predicate=>{const deadline=Date.now()+10000;while(!predicate()){if(rpc.closedError)throw rpc.closedError;if(Date.now()>deadline)throw Error('Missing startup event '+JSON.stringify(events));await new Promise(r=>setTimeout(r,25));}};
 try{
  await rpc.request('initialize',{clientInfo:{name:'startup_test',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
  const first=await rpc.request('thread/start',{cwd:profile,model:'gpt-5.4',ephemeral:true});
  await wait(()=>events.some(e=>e.threadId===first.thread.id&&e.status==='failed'));
  const failure=readMcpStartup(events.find(e=>e.threadId===first.thread.id&&e.status==='failed'),first.thread.id);
  assert.equal(failure.name,'startup_fixture');assert.ok(failure.error);assert.match(mcpStartupText(failure),/启动失败/);
  assert.equal(readMcpStartup(events.find(e=>e.status==='failed'),'unrelated'),undefined);
  assert.ok(events.some(e=>e.threadId===first.thread.id&&e.status==='starting'));
  fs.writeFileSync(path.join(profile,'config.toml'),config(true));await rpc.request('config/mcpServer/reload',{});
  const second=await rpc.request('thread/start',{cwd:profile,model:'gpt-5.4',ephemeral:true});
  await wait(()=>events.some(e=>e.threadId===second.thread.id&&e.status==='ready'));
  assert.equal(readMcpStartup(events.find(e=>e.threadId===second.thread.id&&e.status==='ready'),second.thread.id).status,'ready');
  const inventory=await rpc.request('mcpServerStatus/list',{threadId:second.thread.id,detail:'toolsAndAuthOnly'});
  const server=inventory.data.find(s=>s.name==='startup_fixture');assert.equal(server.runtimeStatus,'connected');assert.ok(Object.values(server.tools).some(tool=>tool.name==='echo'));
 }finally{clearTimeout(timer);rpc.close();await exited;}
});
