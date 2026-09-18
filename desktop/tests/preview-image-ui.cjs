const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { PreviewImage } = await import('/src/PreviewImage.tsx');
      const host = document.createElement('div'); host.style.width = '500px'; document.body.replaceChildren(host);
      const root = ReactDOM.createRoot(host);
      window.__showImage = (width, height) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d'); context.fillStyle = '#e65342'; context.fillRect(0, 0, width, height);
        root.render(React.createElement(PreviewImage, { source: canvas.toDataURL(), name: 'fixture.png' }));
      };
      window.__showImage(1600, 1200);
    });
    const region = page.getByRole('region', { name: '图片预览', exact: true });
    await region.getByRole('status').getByText('1600 × 1200 · 适应窗口', { exact: true }).waitFor();
    const img = region.getByRole('img');
    let bounds = await img.boundingBox(); assert.ok(bounds.width <= 500 && bounds.height <= 385);
    await region.getByRole('button', { name: '原始尺寸', exact: true }).click();
    await region.getByRole('status').getByText('1600 × 1200 · 100%', { exact: true }).waitFor();
    bounds = await img.boundingBox(); assert.equal(bounds.width, 1600); assert.equal(bounds.height, 1200);
    const viewport = region.getByLabel('图片滚动区域', { exact: true });
    assert.ok(await viewport.evaluate(element => element.scrollWidth > element.clientWidth && element.scrollHeight > element.clientHeight));
    await region.getByRole('button', { name: '放大图片', exact: true }).click();
    await region.getByRole('status').getByText('1600 × 1200 · 125%', { exact: true }).waitFor();
    assert.equal((await img.boundingBox()).width, 2000);
    await region.getByRole('button', { name: '缩小图片', exact: true }).click();
    assert.equal((await img.boundingBox()).width, 1600);
    await region.getByRole('button', { name: '适应窗口', exact: true }).click();
    assert.ok((await img.boundingBox()).width <= 500);
    await region.getByRole('button', { name: '放大图片', exact: true }).click();
    await page.evaluate(() => window.__showImage(100, 200));
    await region.getByRole('status').getByText('100 × 200 · 适应窗口', { exact: true }).waitFor();
    assert.equal((await img.boundingBox()).width, 100);
    console.log('PASS: fit, original size, zoom, scrolling and new-image reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
