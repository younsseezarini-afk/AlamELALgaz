// Renders every storyboard frame in storyboard.html to frames/F01.png … F12.png (1080 × 1920).
// Usage: node render-frames.js            (needs Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const dir = __dirname;
const out = path.join(dir, 'frames');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const body = fs.readFileSync(path.join(dir, 'storyboard.html'), 'utf8');
  const tmp = path.join(dir, '.render-tmp.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('export'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const wraps = await page.$$('.fw');
  for (let i = 0; i < wraps.length; i++) {
    const file = path.join(out, `F${String(i + 1).padStart(2, '0')}.png`);
    const b = await wraps[i].boundingBox();
    await page.screenshot({ path: file, fullPage: true, clip: { x: Math.round(b.x), y: Math.round(b.y), width: 1080, height: 1920 } });
    console.log('wrote', path.relative(dir, file));
  }
  await browser.close();
  fs.unlinkSync(tmp);
})();
