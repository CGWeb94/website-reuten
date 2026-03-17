import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Chris/AppData/Roaming/npm/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chromeBase = 'C:/Users/Chris/.cache/puppeteer/chrome/';
const versions = fs.readdirSync(chromeBase).filter(d => fs.statSync(path.join(chromeBase, d)).isDirectory());
const chromePath = path.join(chromeBase, versions[versions.length-1], 'chrome-win64', 'chrome.exe');
const dir = path.join(__dirname, 'temporary screenshots');

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

  // scroll through
  await page.evaluate(async () => {
    await new Promise(r => { let pos=0; const t=setInterval(()=>{ window.scrollTo(0,pos); pos+=300; if(pos>=document.body.scrollHeight){clearInterval(t);r();} },20); });
  });
  await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{
    if(window.gsap){gsap.globalTimeline.progress(1,true);gsap.globalTimeline.pause();}
    document.querySelectorAll('*').forEach(el=>{if(el.style.opacity==='0')el.style.opacity='1';if(el.style.transform&&el.style.transform.includes('translateY'))el.style.transform='none';});
    document.querySelectorAll("[data-count]").forEach(el=>{const t=+el.getAttribute("data-count");const s=t===100?"%":t===1?" Tag":t>100?"+":"";el.textContent=t.toLocaleString("de")+s;});window.scrollTo(0,0);
  });
  await new Promise(r=>setTimeout(r,400));

  // Get section Y positions
  const positions = await page.evaluate(() => {
    const ids = ['stats','about','leistungen','galerie','bewertungen','faq','kontakt'];
    return ids.map(id => { const el = document.getElementById(id); const r = el ? el.getBoundingClientRect() : null; return { id, y: r ? r.top + window.scrollY : 0, h: r ? r.height : 0 }; });
  });
  console.log(JSON.stringify(positions));

  for (const { id, y, h } of positions) {
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({ path: path.join(dir, `s-${id}.png`), clip: { x:0, y:y, width:1440, height: Math.min(h, 1800) } });
  }
  await browser.close();
  console.log('done');
})();
