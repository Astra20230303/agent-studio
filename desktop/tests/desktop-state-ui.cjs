const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.evaluate(async () => {
   const {default:React} = await import('/node_modules/.vite/deps/react.js');
   const {default:ReactDOM} = await import('/node_modules/.vite/deps/react-dom_client.js');
   const {useDesktopState} = await import('/src/useDesktopState.ts');
   const {defaultState} = await import('/src/store.ts');
   window.__writes=[]; window.__settle=[];
   const repository={save:state => {window.__writes.push(structuredClone(state));return new Promise((resolve,reject)=>window.__settle.push({resolve,reject}));}};
   function Fixture(){const store=useDesktopState(defaultState,repository);window.__store=store;return React.createElement('p',{id:'state'},`${store.state.theme}:${store.saveFailed}`);}
   const host=document.createElement('div');document.body.replaceChildren(host);
   window.__root=ReactDOM.createRoot(host);window.__root.render(React.createElement(Fixture));
  });
  await page.waitForFunction(()=>window.__writes.length===1);
  await page.evaluate(()=>window.__store.update(state=>{state.theme='dark';}));
  await page.waitForFunction(()=>window.__writes.length===2);
  // New snapshot must reach the persistence owner while the first is pending.
  assert.deepEqual(await page.evaluate(()=>window.__writes.map(s=>s.theme)),['light','dark']);
  await page.evaluate(()=>window.__settle[1].reject(Error('new write failed')));
  await page.locator('#state').filter({hasText:'dark:true'}).waitFor();
  await page.evaluate(()=>window.__settle[0].resolve());
  assert.equal(await page.locator('#state').textContent(),'dark:true');
  await page.evaluate(()=>window.__store.retrySave());
  await page.waitForFunction(()=>window.__writes.length===3);
  assert.equal(await page.evaluate(()=>window.__writes[2].theme),'dark');
  await page.evaluate(()=>window.__settle[2].resolve());
  await page.locator('#state').filter({hasText:'dark:false'}).waitFor();
  console.log('PASS: state owner forwards snapshots immediately, isolates stale save outcomes and retries latest state');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
