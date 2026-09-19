const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { configNotice } = require('../src/configNotice.ts');

test('real app-server config diagnostics expose rule file location and recover after repair', { timeout: 20000 }, async () => {
 const root = path.resolve(__dirname, '../..');
 const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
 const profile = fs.mkdtempSync(path.join(cache, 'config-notice-live-'));
 const resolved = findCommand(root);
 const child = spawn(resolved.command, [...resolved.args, '-c', `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
 const warnings=[];
 const exited = once(child, 'exit'); const rpc = new CodexRpc(child); const timer = setTimeout(() => rpc.close(), 15000);
 rpc.on('notification',message=>{if(message.method==='configWarning')warnings.push(message);});
 try {
  await rpc.request('initialize', { clientInfo: { name: 'catalog_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
  const rulesDir=path.join(profile,'rules');fs.mkdirSync(rulesDir,{recursive:true});
  const rulesPath=path.join(rulesDir,'broken.rules');fs.writeFileSync(rulesPath,'prefix_rule(');
  await rpc.request('thread/start',{cwd:profile,model:'gpt-5.4'});
  const deadline=Date.now()+5000;
  while(!warnings.some(message=>message.params.summary.includes('Error parsing rules'))){if(Date.now()>deadline)throw Error('Missing real config warning');await new Promise(resolve=>setTimeout(resolve,25));}
  const message=warnings.find(message=>message.params.summary.includes('Error parsing rules'));
  assert.equal(path.basename(message.params.path),'broken.rules');
  assert.deepEqual(message.params.range.start,{line:1,column:13});
  const rendered=configNotice(message.method,message.params);
  assert.match(rendered,/配置警告：Error parsing rules/);assert.match(rendered,/broken.rules/);assert.match(rendered,/第 1 行，第 13 列/);assert.match(rendered,/Parse error/);
  fs.writeFileSync(rulesPath,'prefix_rule(pattern=["echo"], decision="allow")\n');
  const count=warnings.length;
  const {thread}=await rpc.request('thread/start',{cwd:profile,model:'gpt-5.4'});
  assert.ok(thread.id);
  await rpc.request('model/list',{});
  assert.equal(warnings.length,count,'repaired rules should not emit another config warning');
 } finally { clearTimeout(timer); rpc.close(); await exited; }
});
