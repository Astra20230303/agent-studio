const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [{ id: 'a', title: 'Current', status: 'completed', messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const editor = page.getByRole('textbox', { name: '消息', exact: true });
    await editor.fill('preserve menu draft');
    const toggle=page.getByRole('button',{name:'菜单',exact:true});
    const menu=page.getByRole('menu',{name:'菜单',exact:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('header > *')].map(n=>({tag:n.tagName,cls:n.className,right:n.getBoundingClientRect().right})))));
    for (const button of await page.locator('.window-controls button').all()) {
      const rect=await button.boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=390);
    }
    await toggle.click();
    await menu.waitFor();
    const rect=await menu.boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=390 && rect.y+rect.height<=700);
    await page.keyboard.press('End');
    assert.equal(await menu.getByRole('menuitem').last().evaluate(node=>node===document.activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await toggle.evaluate(node=>node===document.activeElement),true);
    await toggle.click();
    await menu.getByRole('menuitem',{name:'文件 · 新建会话',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length===2);
    assert.equal(await editor.inputValue(),'');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-thread-drafts-v1')).a),'preserve menu draft');
    await toggle.click();
    await menu.getByRole('menuitem',{name:'帮助 · 打开设置',exact:true}).click();
    await page.getByRole('button',{name:'返回应用',exact:true}).click();
    await page.getByRole('button',{name:'展开侧栏',exact:true}).click();
    await page.getByRole('button',{name:'已安排',exact:true}).click();
    await page.locator('.scheduled-page').waitFor();
    assert.equal(await toggle.isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await toggle.click();
    await menu.getByRole('menuitem',{name:'文件 · 新建会话',exact:true}).click();
    await editor.waitFor();
    assert.equal(await toggle.isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.setViewportSize({width:390,height:450});
    await toggle.click();
    await page.keyboard.press('End');
    const last=await menu.getByRole('menuitem').last().boundingBox();
    assert.ok(last.y>=0 && last.y+last.height<=450);
    await page.setViewportSize({width:1280,height:844});
    await menu.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'文件',exact:true}).waitFor();
    console.log('PASS: first-load compact titlebar fits, retains all menu actions, keyboard focus and draft; resize dismisses popup');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
