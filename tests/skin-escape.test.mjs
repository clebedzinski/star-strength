import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skins = ['starclassic', 'pixelforecast', 'irondial', 'chalkboard', 'scoreboard', 'transitline', 'vinyldeck', 'hexhive'];
const tabs = ['log', 'routines', 'history', 'analytics'];

test('every skin and tab has Settings and a way back to Log', async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const missing = [];
  try {
  for (const skin of skins) {
    for (const tab of tabs) {
      await page.goto('file://' + root + '/index.html?demo=1&blank=1&skin=' + skin + '&tab=' + tab, { waitUntil: 'domcontentloaded' });
      const found = await page.evaluate(() => {
        function ok(list) {
          return [...list].some((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.display !== 'none' && s.visibility !== 'hidden' && r.width >= 44 && r.height >= 40;
          });
        }
        return {
          settings: ok(document.querySelectorAll('[data-overlay="settings"]')),
          log: ok(document.querySelectorAll('[data-act="back-log"], [data-act="tab"][data-tab="log"]'))
        };
      });
      if (!found.settings || !found.log) missing.push(skin + ' ' + tab + ' settings=' + found.settings + ' log=' + found.log);
    }
    await page.goto('file://' + root + '/index.html?demo=1&blank=1&mini=1&skin=' + skin, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.querySelector('#mini-root [data-act="mini-wide"]').click());
    const mini = await page.evaluate(() => {
      function ok(list) {
        return [...list].some((el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width >= 32 && r.height >= 28;
        });
      }
      const root = document.getElementById('mini-root');
      return {
        settings: ok(root.querySelectorAll('[data-overlay="settings"]')),
        log: ok(root.querySelectorAll('[data-act="back-log"]'))
      };
    });
    if (!mini.settings || !mini.log) missing.push(skin + ' mini settings=' + mini.settings + ' log=' + mini.log);
  }
  } finally {
    await browser.close();
  }
  assert.deepEqual(missing, []);
});
