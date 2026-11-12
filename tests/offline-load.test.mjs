import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skins = ['starclassic', 'pixelforecast', 'irondial', 'chalkboard', 'scoreboard', 'transitline', 'vinyldeck', 'hexhive'];

test('load makes zero external network requests on every skin', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-background-networking', '--disable-sync', '--no-first-run', '--disable-component-update']
  });
  const external = [];
  try {
    const context = await browser.newContext();
    const page = await context.newPage({ viewport: { width: 390, height: 844 } });
    page.on('request', function (req) {
      const url = req.url();
      if (/^(file|data|blob):/i.test(url)) return;
      external.push(req.method() + ' ' + url);
    });
    for (const skin of skins) {
      const before = external.length;
      await page.goto('file://' + root + '/index.html?demo=1&blank=1&skin=' + skin, { waitUntil: 'load' });
      await page.waitForSelector('.log-set');
      const fonts = await page.evaluate(async () => {
        const names = ['Inter', 'Chakra Petch', 'Orbitron', 'Permanent Marker', 'Press Start 2P', 'Share Tech Mono', 'Space Grotesk'];
        await Promise.all(names.map((n) => document.fonts.load('16px "' + n + '"')));
        await document.fonts.ready;
        const resources = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /^https?:/i.test(n));
        return {
          google: document.querySelector('link[href*="fonts.google"], link[href*="fonts.gstatic"], link[href*="http"]') ? 1 : 0,
          missing: names.filter((n) => !document.fonts.check('16px "' + n + '"')),
          resources
        };
      });
      if (fonts.google) external.push(skin + ' still links an external stylesheet');
      if (fonts.missing.length) external.push(skin + ' font not loaded ' + fonts.missing.join(','));
      fonts.resources.forEach((url) => external.push(skin + ' resource ' + url));
      if (external.length !== before) external.push('after ' + skin);
    }
    await context.close();
  } finally {
    await browser.close();
  }
  assert.deepEqual(external, []);
});
