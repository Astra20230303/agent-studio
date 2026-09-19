const {_electron:electron}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'../..');const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'felix-mcp-download-'));const desktop=path.join(scratch,'install','desktop');
 fs.cpSync(path.join(root,'desktop/electron'),path.join(desktop,'electron'),{recursive:true});fs.cpSync(path.join(root,'desktop/dist'),path.join(desktop,'dist'),{recursive:true});fs.symlinkSync(path.join(root,'desktop/node_modules'),path.join(desktop,'node_modules'),'junction');
 const env={...process.env,FELIX_DATA_DIR:path.join(scratch,'profile')};for(const key of ['ELECTRON_RUN_AS_NODE','CODEX_APP_SERVER_COMMAND','VITE_DEV_SERVER_URL','MINIMAX_API_KEY'])delete env[key];
 let app;
 try{
  app=await electron.launch({executablePath:require('electron'),args:[path.join(desktop,'electron/main.cjs')],env,timeout:20000});const page=await app.firstWindow();
  await app.evaluate(({ipcMain})=>{
   for(const channel of ['codex:connect','codex:request','codex:notify'])ipcMain.removeHandler(channel);
   ipcMain.handle('codex:connect',async()=>({ok:true}));ipcMain.handle('codex:notify',async()=>({ok:true}));
   ipcMain.handle('codex:request',async(_event,{method})=>({ok:true,result:method==='mcpServerStatus/list'?{data:[{name:'fixture',authStatus:'unsupported',resources:[{uri:'fixture://files/bytes.bin',name:'Binary fixture'}],tools:{}}]}:method==='mcpServer/resource/read'?{contents:[{uri:'fixture://files/bytes.bin',mimeType:'application/octet-stream',blob:'AP+ADQo='}]}:{data:[],marketplaces:[]}}));
  });
  await page.reload();assert.ok(page.url().startsWith('file:'));await page.getByRole('button',{name:'插件',exact:true}).click();await page.getByRole('button',{name:'管理 MCP 服务',exact:true}).click();
  await page.getByRole('checkbox',{name:'显示资源目录',exact:true}).check();await page.getByRole('button',{name:'Binary fixture',exact:true}).click();
  const filename=path.join(scratch,'saved-resource.bin');
  await app.evaluate(({session},filename)=>{globalThis.__download=undefined;session.defaultSession.once('will-download',(_event,item)=>{globalThis.__suggested=item.getFilename();item.setSavePath(filename);item.once('done',(_event,state)=>{globalThis.__download=state;});});},filename);
  const url=page.url();await page.getByRole('link',{name:'下载资源文件',exact:true}).click();
  let state;for(let attempt=0;attempt<100;attempt++){state=await app.evaluate(()=>globalThis.__download);if(state)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(state,'completed');assert.equal(await app.evaluate(()=>globalThis.__suggested),'bytes.bin');assert.deepEqual(fs.readFileSync(filename),Buffer.from([0,255,128,13,10]));assert.equal(page.url(),url);assert.equal(app.windows().length,1);
  console.log('PASS: production Electron MCP resource download uses native download handling and preserves exact bytes');
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
