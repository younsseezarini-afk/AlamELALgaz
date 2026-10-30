// Renders reel.html to video frames with headless Chromium.
//   node render-reel.js stills 0.5,2.0,...   → stills/t_<time>.png for checking
//   node render-reel.js frames [fps]         → .frames/f00000.jpg … and sfx.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const dir = __dirname;
const [mode = 'frames', arg] = process.argv.slice(2);

async function openPage(browser, tmp) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(() => { window.__RENDER__ = true; });
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.reelReady);
  return page;
}

(async () => {
  const tmp = path.join(dir, '.reel-tmp.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${fs.readFileSync(path.join(dir, 'reel.html'), 'utf8')}</body></html>`);
  const browser = await chromium.launch();
  try {
    if (mode === 'stills') {
      const out = path.join(dir, '.stills');
      fs.mkdirSync(out, { recursive: true });
      const page = await openPage(browser, tmp);
      for (const t of arg.split(',').map(Number)) {
        await page.evaluate((t) => window.renderAt(t), t);
        await page.screenshot({ path: path.join(out, `t_${t.toFixed(2)}.png`) });
      }
    } else {
      const fps = Number(arg) || 30;
      const out = path.join(dir, '.frames');
      fs.mkdirSync(out, { recursive: true });
      const probe = await openPage(browser, tmp);
      const { dur, sfx } = await probe.evaluate(() => ({ dur: window.DUR, sfx: window.SFX }));
      fs.writeFileSync(path.join(dir, '.sfx.json'), JSON.stringify({ dur, bar: 240 / 105, sfx }));
      await probe.close();
      const total = Math.round(dur * fps);
      const workers = 4;
      let done = 0;
      await Promise.all([...Array(workers)].map(async (_, w) => {
        const page = await openPage(browser, tmp);
        for (let i = w; i < total; i += workers) {
          await page.evaluate((t) => window.renderAt(t), i / fps);
          await page.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
          if (++done % 150 === 0) console.log(`${done}/${total}`);
        }
      }));
      console.log(`rendered ${total} frames at ${fps} fps`);
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }
})();
