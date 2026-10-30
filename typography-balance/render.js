// Renders motion.html to an MP4 (H.264, 1080x1920, 30fps) and exports storyboard key frames.
// Usage: node render.js [out.mp4]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.resolve(process.argv[2] || path.join(__dirname, 'typographic-balance.mp4'));
const frameDir = path.join(__dirname, 'storyboard', 'frames');
const KEY = [1.7, 2.9, 5.6, 7.0, 9.2, 13.0, 14.15, 16.9, 19.0, 20.9, 24.9, 28.6];

(async () => {
  fs.mkdirSync(frameDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(__dirname, 'motion.html') + '?capture');
  const { fps, dur } = await page.evaluate(async () => { await window.ready; return { fps: FPS, dur: DUR }; });

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const grab = (t, type) => page.evaluate(([t, type]) => { renderAt(t); return document.getElementById('c').toDataURL(type, .95); }, [t, type]);
  const total = Math.round(fps * dur);
  for (let f = 0; f < total; f++) {
    const buf = Buffer.from((await grab(f / fps, 'image/png')).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));

  for (const t of KEY) {
    const buf = Buffer.from((await grab(t, 'image/jpeg')).split(',')[1], 'base64');
    fs.writeFileSync(path.join(frameDir, `t${t.toFixed(2)}.jpg`), buf);
  }
  await browser.close();
  console.log('wrote', out);
})();
