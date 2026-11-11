import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'compare');
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files']
});

async function shoot(page, file) {
  const close = await page.$('[data-act="whats-close"]');
  if (close) {
    await close.click();
    await new Promise((r) => setTimeout(r, 80));
  }
  await page.screenshot({ path: file });
}

const shots = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1280, height: 900, mobile: false }
];

for (const shot of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width: shot.width, height: shot.height, deviceScaleFactor: 1, isMobile: shot.mobile, hasTouch: shot.mobile });
  await page.goto('file:///tmp/original-star-strength.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    appState.activeDay = 'Push';
    renderActiveDaySelector();
    renderExercises();
  });
  await new Promise((r) => setTimeout(r, 200));
  await shoot(page, path.join(out, 'original-' + shot.name + '.png'));
  await page.goto('file://' + root + '/index.html?demo=1&blank=1&skin=starclassic', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 250));
  const metrics = await page.evaluate(() => ({
    appScroll: document.getElementById('app').scrollWidth,
    appClient: document.getElementById('app').clientWidth,
    docScroll: document.documentElement.scrollWidth,
    docClient: document.documentElement.clientWidth,
    brand: (document.querySelector('.ss-brand') || {}).innerText || '',
    overlay: !!document.querySelector('.overlay')
  }));
  console.log(shot.name, JSON.stringify(metrics));
  await shoot(page, path.join(out, 'classic-' + shot.name + '.png'));
  await page.close();
}
await browser.close();
console.log('shots ready');
