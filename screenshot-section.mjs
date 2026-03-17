import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Chris/AppData/Roaming/npm/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chromeBase = 'C:/Users/Chris/.cache/puppeteer/chrome/';
const versions = fs.readdirSync(chromeBase).filter(d => fs.statSync(path.join(chromeBase, d)).isDirectory());
const chromePath = path.join(chromeBase, versions[versions.length-1], 'chrome-win64', 'chrome.exe');
const screenshotDir = path.join(__dirname, 'temporary screenshots');

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

  // scroll through to trigger all animations
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let pos = 0; const step = 200;
      const t = setInterval(() => { window.scrollTo(0, pos); pos += step; if (pos >= document.body.scrollHeight) { clearInterval(t); resolve(); } }, 16);
    });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    if (window.gsap) { gsap.globalTimeline.progress(1, true); gsap.globalTimeline.pause(); }
    document.querySelectorAll('*').forEach(el => { if (el.style.opacity === '0') el.style.opacity = '1'; if (el.style.transform && el.style.transform.includes('translateY')) el.style.transform = 'none'; });
  });

  const sections = [
    { id: 'hero', name: 'hero' },
    { id: 'stats', name: 'stats' },
    { id: 'about', name: 'about' },
    { id: 'leistungen', name: 'leistungen' },
    { id: 'galerie', name: 'galerie' },
    { id: 'bewertungen', name: 'bewertungen' },
    { id: 'faq', name: 'faq' },
    { id: 'kontakt', name: 'kontakt' },
  ];

  for (const sec of sections) {
    const el = await page.$('#' + sec.id);
    if (!el) continue;
    await el.scrollIntoView();
    await new Promise(r => setTimeout(r, 200));
    const box = await el.boundingBox();
    await page.screenshot({ path: path.join(screenshotDir, `section-${sec.name}.png`), clip: { x: 0, y: Math.max(0, box.y), width: 1440, height: Math.min(box.height, 2000) } });
  }
  await browser.close();
  console.log('done');
})();
