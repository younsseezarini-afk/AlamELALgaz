// usage: node render.js <start_sec> <end_sec> <out.mp4> [fps]  |  node render.js --stills t1,t2,... outdir
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => window.ENGINE_READY);
  const FPS = 30;
  if (args[0] === '--stills') {
    const ts = args[1].split(',').map(Number), out = args[2];
    for (const t of ts) {
      await page.evaluate(([t, f]) => window.renderFrame(t, f), [t, Math.round(t * FPS)]);
      await page.screenshot({ path: path.join(out, `still_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 88 });
    }
    await browser.close(); return;
  }
  const s0 = +args[0], s1 = +args[1], out = args[2];
  const f0 = Math.round(s0 * FPS), f1 = Math.round(s1 * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-threads', '2', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(([t, f]) => window.renderFrame(t, f), [f / FPS, f]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 250 === 0) console.log(`[${out}] frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`[${out}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await browser.close();
})();
