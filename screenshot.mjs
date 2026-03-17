import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Chris/AppData/Roaming/npm/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

// Find next available screenshot number
function nextScreenshotPath(label) {
  let n = 1;
  while (true) {
    const name = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
    if (!fs.existsSync(path.join(screenshotDir, name))) return path.join(screenshotDir, name);
    n++;
  }
}

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Discover Chrome path
const chromeBase = 'C:/Users/Chris/.cache/puppeteer/chrome/';
const versions = fs.readdirSync(chromeBase).filter(d => fs.statSync(path.join(chromeBase, d)).isDirectory());
if (!versions.length) { console.error('No Chrome found in', chromeBase); process.exit(1); }
const chromePath = path.join(chromeBase, versions[versions.length - 1], 'chrome-win64', 'chrome.exe');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Scroll through page to trigger all ScrollTrigger animations
  await page.evaluate(async () => {
    await new Promise(resolve => {
      const totalH = document.body.scrollHeight;
      let pos = 0;
      const step = 300;
      const tick = setInterval(() => {
        window.scrollTo(0, pos);
        pos += step;
        if (pos >= totalH) { clearInterval(tick); resolve(); }
      }, 20);
    });
  });
  await new Promise(r => setTimeout(r, 800));

  // Force all GSAP complete, scroll back to top
  await page.evaluate(() => {
    if (window.gsap) {
      gsap.globalTimeline.progress(1, true);
      gsap.globalTimeline.pause();
    }
    // Make all elements fully visible as fallback
    document.querySelectorAll('*').forEach(el => {
      const s = el.style;
      if (s.opacity === '0') s.opacity = '1';
      if (s.transform && s.transform.includes('translateY')) s.transform = 'none';
    });
    // Force counters to final value
    document.querySelectorAll('[data-count]').forEach(el => {
      const t = +el.getAttribute('data-count');
      const s = t === 100 ? '%' : t === 1 ? ' Tag' : t > 100 ? '+' : '';
      el.textContent = t.toLocaleString('de') + s;
    });
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 600));

  const outPath = nextScreenshotPath(label);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Screenshot saved:', outPath);

  await browser.close();
})();
