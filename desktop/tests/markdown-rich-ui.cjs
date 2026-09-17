const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const content=['#### Details','','> quoted **strong**','','- parent','  - nested *emphasis*','- [x] completed','- [ ] pending','','3. third','4. fourth','','---','','[reference][docs]', '', '[**Bold** and *em*](https://example.com/styled)', '', '[unsafe](javascript:alert%281%29)','','[docs]: https://example.com/docs','','`` &amp; `code` `` and &amp;','','<script>window.__executed=true</script>','','```js','const x = "<tag>";','```'].join('\n');
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'t',threads:[{id:'t',title:'Markdown',status:'completed',updatedAt:'',messages:[{id:'m',role:'assistant',content,createdAt:''}]}]}));
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('heading',{level:4,name:'Details',exact:true}).waitFor();
 assert.equal(await page.locator('.markdown-content blockquote strong').innerText(),'strong');
 assert.equal(await page.locator('.markdown-content ul ul em').innerText(),'emphasis');
 assert.equal(await page.getByRole('checkbox',{name:'已完成任务'}).isChecked(),true);assert.equal(await page.getByRole('checkbox',{name:'未完成任务'}).isDisabled(),true);
 assert.equal(await page.locator('.markdown-content ol').getAttribute('start'),'3');assert.equal(await page.locator('.markdown-content hr').count(),1);
 assert.equal(await page.getByRole('link',{name:'reference',exact:true}).getAttribute('href'),'https://example.com/docs');
 assert.equal(await page.locator('.markdown-content p code').innerText(),'&amp; `code`');
 assert.equal(await page.locator('.code-block code').innerText(),'const x = "<tag>";');
 assert.equal(await page.getByRole('link',{name:'Bold and em',exact:true}).locator('strong').innerText(),'Bold');
 assert.equal(await page.locator('.markdown-content a[href^="javascript:"]').count(),0);
 assert.equal(await page.locator('.markdown-content script').count(),0);assert.equal(await page.evaluate(()=>window.__executed),undefined);
 console.log('PASS: semantic headings, nested lists, tasks, quotes, references, entities and inert HTML');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
