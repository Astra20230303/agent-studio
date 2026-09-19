const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__opened=[];
   window.desktop={listModels:async()=>({ok:true,models:['test']}),openExternal:async url=>{window.__opened.push(url);}};
   const model=(id,extra={})=>({id,model:id,displayName:id,description:'',hidden:false,supportedReasoningEfforts:[],...extra});
   window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async method=>({ok:true,result:{data:method==='model/list'?[
    model('old',{upgrade:'legacy',upgradeInfo:{model:'next',upgradeCopy:'请迁移到新模型',modelLink:'https://example.com/models/next',migrationMarkdown:'**迁移步骤**\n\n<script>window.__injected=true</script>',retirementAt:0}}),
    model('legacy',{upgrade:'replacement'}),model('ordinary'),model('unsafe',{upgradeInfo:{model:'safe',modelLink:'javascript:alert(1)'}})
   ]:[]}}),onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:15439');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  const panel=page.getByRole('region',{name:'Codex 模型目录',exact:true});
  await panel.getByRole('button',{name:'刷新模型目录',exact:true}).click();
  await panel.getByText('请迁移到新模型',{exact:true}).waitFor();
  assert.equal(await panel.locator('time').getAttribute('datetime'),'1970-01-01T00:00:00.000Z');
  await panel.getByText('迁移说明',{exact:true}).click();
  await panel.locator('strong').filter({hasText:'迁移步骤'}).waitFor();
  assert.equal(await panel.locator('script').count(),0);
  assert.equal(await page.evaluate(()=>window.__injected),undefined);
  await panel.getByRole('link',{name:'查看模型说明',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.__opened),['https://example.com/models/next']);
  assert.equal(await panel.locator('a').count(),1);
  assert.equal(await panel.locator('code').filter({hasText:'replacement'}).count(),1);
  assert.equal(await panel.locator('li').filter({has:page.getByText('ordinary',{exact:true})}).getByText('推荐替代模型：',{exact:false}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: upgrade metadata, legacy fallback, UTC date, safe markdown and model link');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
