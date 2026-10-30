// Renders reel.html (or the file named in $REEL) to video frames with headless Chromium.
//   node render-reel.js stills 0.5,2.0,...   → stills/t_<time>.png for checking
//   node render-reel.js frames [fps]         → .frames/f00000.jpg … and sfx.json
//   node render-reel.js video [fps] [sub]    → .seg0.mp4 … with motion blur (sub sub-frames averaged per frame) and .sfx.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');

// ES modules and fetch() need http://, so pages are served from this folder
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
function serve(root) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
let BASE = '';

const dir = __dirname;
const [mode = 'frames', arg] = process.argv.slice(2);

async function openPage(browser, tmp) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(() => { window.__RENDER__ = true; });
  await page.goto(BASE + path.basename(tmp), { waitUntil: 'networkidle' });
  await page.evaluate(() => window.reelReady);
  return page;
}

(async () => {
  const tmp = path.join(dir, '.reel-tmp.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body>${fs.readFileSync(path.join(dir, process.env.REEL || 'reel.html'), 'utf8')}</body></html>`);
  const srv = await serve(dir);
  BASE = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    if (mode === 'stills') {
      const out = path.join(dir, '.stills');
      fs.mkdirSync(out, { recursive: true });
      const page = await openPage(browser, tmp);
      for (const t of arg.split(',').map(Number)) {
        await page.evaluate((t) => window.renderAt(t), t);
        await page.screenshot({ path: path.join(out, `t_${t.toFixed(2)}.png`) });
      }
    } else if (mode === 'video') {
      const fps = Number(arg) || 30, sub = Number(process.argv[4]) || 4, shutter = 0.5;
      const probe = await openPage(browser, tmp);
      const { dur, sfx, gaps } = await probe.evaluate(() => ({ dur: window.DUR, sfx: window.SFX, gaps: window.GAPS || [] }));
      fs.writeFileSync(path.join(dir, '.sfx.json'), JSON.stringify({ dur, bar: 240 / 105, sfx, gaps }));
      await probe.close();
      const total = Math.round(dur * fps), workers = 4, per = Math.ceil(total / workers);
      let done = 0;
      await Promise.all([...Array(workers)].map(async (_, w) => {
        const a = w * per, b = Math.min(total, a + per);
        const page = await openPage(browser, tmp);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', 'mjpeg', '-i', '-',
          '-vf', `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB)`, '-r', String(fps),
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-pix_fmt', 'yuv420p', path.join(dir, `.seg${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
        const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
        for (let i = a; i < b; i++) {
          for (let k = 0; k < sub; k++) {
            const t = Math.max(0, i / fps + ((k + 0.5) / sub - 0.5) * shutter / fps);
            await page.evaluate((t) => window.renderAt(t), t);
            const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
            if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
          }
          if (++done % 150 === 0) console.log(`${done}/${total}`);
        }
        ff.stdin.end();
        await closed;
      }));
      fs.writeFileSync(path.join(dir, '.segs.txt'), [...Array(workers)].map((_, w) => `file '.seg${w}.mp4'`).join('\n') + '\n');
      console.log(`rendered ${total} frames at ${fps} fps × ${sub} sub-frames`);
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
    srv.close();
    fs.unlinkSync(tmp);
  }
})();
