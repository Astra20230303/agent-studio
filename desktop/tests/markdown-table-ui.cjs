const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
  const content=String.raw`| Name | Value |
| :--- | ---: |
| a\|b | **value** |
| --- | --- |

| Single |
| --- |
| one |

Bad | Header
--- | --- | ---
`;
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'t',threads:[{id:'t',title:'Tables',messages:[{id:'m',role:'assistant',content,createdAt:''}],status:'completed',updatedAt:''}]}));
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 const tables=page.locator('.md-table');await tables.first().waitFor();assert.equal(await tables.count(),2);
 assert.deepEqual(await tables.first().locator('tbody tr').first().locator('td').allTextContents(),['a|b','value']);
 assert.equal(await tables.first().locator('tbody tr').count(),2);
 assert.equal(await tables.nth(1).locator('th').innerText(),'Single');
 assert.equal(await tables.first().locator('td').nth(1).evaluate(node=>getComputedStyle(node).textAlign),'right');
 const region=page.getByRole('region',{name:'消息表格',exact:true}).first();
 assert.equal(await region.evaluate(node=>node.scrollWidth>node.clientWidth),true);
 await region.focus();assert.equal(await region.evaluate(node=>node===document.activeElement),true);
 await page.getByText('Bad | Header --- | --- | ---',{exact:true}).waitFor();
 console.log('PASS: escaped table cells, single columns, alignment, divider body rows and narrow scrolling');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
