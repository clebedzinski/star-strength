import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'artifacts', 'review');
fs.mkdirSync(out, { recursive: true });
const skins = ['starclassic', 'pixelforecast', 'irondial', 'chalkboard', 'scoreboard', 'transitline', 'vinyldeck', 'hexhive'];
const widths = [360, 390, 412];
const failures = [];

function relLum(rgb) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}
function parseColor(c) {
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: c.includes('rgba') ? parseFloat(c.split(',')[3]) : 1 };
}
function contrast(a, b) {
  const L1 = relLum(a), L2 = relLum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files']
});

async function shoot(page, name) {
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  return file;
}
async function measure(page) {
  return page.evaluate(() => {
    const app = document.getElementById('app');
    const doc = document.documentElement;
    const nodes = [...document.querySelectorAll('button, input, select, textarea, .log-set, .primary, .ghost, .sticky, .hex, .station, .tab')];
    const controls = nodes.slice(0, 80).map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40),
        color: s.color,
        bg: s.backgroundColor,
        w: Math.round(r.width),
        h: Math.round(r.height),
        hidden: s.display === 'none' || s.visibility === 'hidden' || r.width === 0
      };
    });
    return {
      appScroll: app.scrollWidth,
      appClient: app.clientWidth,
      docScroll: doc.scrollWidth,
      docClient: doc.clientWidth,
      controls
    };
  });
}
function check(name, data) {
  if (data.appScroll > data.appClient + 1) failures.push(name + ' app scroll ' + data.appScroll + '>' + data.appClient);
  if (data.docScroll > data.docClient + 1) failures.push(name + ' doc scroll ' + data.docScroll + '>' + data.docClient);
  data.controls.forEach((c) => {
    if (c.hidden) return;
    if (c.tag === 'BUTTON' && (c.w < 44 || c.h < 40)) failures.push(name + ' small tap ' + c.text + ' ' + c.w + 'x' + c.h);
    const fg = parseColor(c.color), bg = parseColor(c.bg);
    if (!fg || !bg || bg.a === 0) return;
    const ratio = contrast(fg, bg);
    if (ratio < 3 && c.text.trim()) failures.push(name + ' contrast ' + ratio.toFixed(2) + ' "' + c.text + '" ' + c.color + ' on ' + c.bg);
  });
}

const page = await browser.newPage();
for (const width of widths) {
  await page.setViewport({ width, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  for (const skin of skins) {
    await page.goto('file://' + root + '/index.html?demo=1&skin=' + skin, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 150));
    const data = await measure(page);
    check(width + '-' + skin, data);
    if (width === 390) await shoot(page, '390-' + skin + '-log');
    else await shoot(page, width + '-' + skin + '-log');
  }
}
await page.setViewport({ width: 800, height: 360, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
for (const skin of skins) {
  await page.goto('file://' + root + '/index.html?demo=1&skin=' + skin, { waitUntil: 'domcontentloaded' });
  const data = await measure(page);
  check('land-' + skin, data);
  await shoot(page, 'land-' + skin + '-log');
}

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const shots = [
  ['390-settings-basic', 'file://' + root + '/index.html?demo=1&skin=starclassic&panel=settings'],
  ['390-settings-pixel', 'file://' + root + '/index.html?demo=1&skin=pixelforecast&panel=settings'],
  ['390-new-routine', 'file://' + root + '/index.html?demo=1&skin=vinyldeck&panel=builder'],
  ['390-import', 'file://' + root + '/index.html?demo=1&skin=starclassic&panel=xml'],
  ['390-chalk', 'file://' + root + '/index.html?demo=1&skin=chalkboard'],
  ['390-iron', 'file://' + root + '/index.html?demo=1&skin=irondial'],
  ['390-transit', 'file://' + root + '/index.html?demo=1&skin=transitline']
];
for (const [name, url] of shots) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 120));
  check(name, await measure(page));
  await shoot(page, name);
}
await page.goto('file://' + root + '/index.html?demo=1&skin=starclassic&panel=settings', { waitUntil: 'domcontentloaded' });
await page.click('[data-act="basic"]');
await new Promise((r) => setTimeout(r, 100));
check('390-settings-advanced', await measure(page));
await shoot(page, '390-settings-advanced');

await page.goto('file://' + root + '/index.html?demo=1&skin=irondial', { waitUntil: 'domcontentloaded' });
await page.click('[data-act="manage"]');
check('390-manage', await measure(page));
await shoot(page, '390-iron-manage');
await page.click('[data-act="pop-close"]');
await page.click('[data-act="log-set"]');
await new Promise((r) => setTimeout(r, 200));
check('390-rest', await measure(page));
await shoot(page, '390-iron-rest');
await page.click('[data-act="mini-open"]');
check('390-mini', await measure(page));
await shoot(page, '390-iron-mini');

await page.goto('file://' + root + '/index.html?demo=1&skin=starclassic', { waitUntil: 'domcontentloaded' });
await page.click('[data-tab="history"]');
check('390-history', await measure(page));
await shoot(page, '390-history');
await page.goto('file://' + root + '/index.html?demo=1&skin=chalkboard', { waitUntil: 'domcontentloaded' });
await page.click('[data-tab="routines"]');
check('390-routines', await measure(page));
await shoot(page, '390-routines');

const poisoned = await page.evaluate(() => document.body.innerText.includes('click'));
if (poisoned) failures.push('touch UI still shows the word click');

await browser.close();
fs.writeFileSync(path.join(out, 'failures.json'), JSON.stringify(failures, null, 2));
console.log('failures', failures.length);
failures.slice(0, 40).forEach((f) => console.log(' -', f));
console.log('wrote', out);
