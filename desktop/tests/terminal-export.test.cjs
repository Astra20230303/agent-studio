const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {saveTerminal} = require('../electron/conversation-export.cjs');
test('terminal export writes UTF-8 text, handles cancellation and disk failures',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-log-'));
 try {
  const filePath=path.join(root,'log.txt');
  assert.deepEqual(await saveTerminal({filename:'terminal.txt',content:'日志\nhello\n'},async options=>{assert.deepEqual(options.filters[0].extensions,['txt']);return {filePath};}),{ok:true});
  assert.equal(await fs.readFile(filePath,'utf8'),'日志\nhello\n');
  assert.deepEqual(await saveTerminal({filename:'terminal.txt',content:'overwrite'},async()=>({canceled:true,filePath})),{ok:true,canceled:true});
  assert.equal(await fs.readFile(filePath,'utf8'),'日志\nhello\n');
  assert.equal((await saveTerminal({filename:'terminal.txt',content:'x'},async()=>({filePath:root}))).ok,false);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
