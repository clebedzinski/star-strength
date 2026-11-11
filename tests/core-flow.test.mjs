import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skins = ['starclassic', 'pixelforecast', 'irondial', 'chalkboard', 'scoreboard', 'transitline', 'vinyldeck', 'hexhive'];

async function openSkin(page, skin) {
  await page.goto('file://' + root + '/index.html?demo=1&blank=1&skin=' + skin);
  await page.waitForSelector('.log-set');
}

test('core flow works in every skin', async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const problems = [];
  try {
    for (const skin of skins) {
      await openSkin(page, skin);
      const title = await page.locator('h1').evaluate((el) => ({ text: el.textContent, clipped: el.scrollWidth > el.clientWidth + 2 }));
      if (!title.text.includes('Strength in Character') || title.clipped) problems.push(skin + ' title ' + JSON.stringify(title));
      for (let i = 0; i < 3; i++) {
        await page.locator('.log-set').click();
        await page.waitForTimeout(500);
      }
      const name = await page.locator('.ex-name').innerText();
      if (!/Incline/i.test(name)) problems.push(skin + ' did not advance after 3 sets: ' + name);
      const resting = await page.locator('.zone-rest').getAttribute('data-resting');
      const count = await page.locator('.rest-count').innerText();
      if (resting !== 'true' || count === '00:00') problems.push(skin + ' rest not visible ' + resting + ' ' + count);
      await page.getByRole('button', { name: 'Skip' }).click();
      await page.waitForTimeout(50);
      if (await page.locator('.zone-rest').getAttribute('data-resting') !== 'false') problems.push(skin + ' skip failed');
      await page.getByRole('button', { name: 'Turn rest off' }).click();
      await page.locator('.log-set').click();
      await page.waitForTimeout(500);
      if (await page.locator('.zone-rest').getAttribute('data-resting') !== 'false') problems.push(skin + ' rest stayed on after disable');
      await page.getByRole('button', { name: 'Tempo on' }).click();
      if (await page.locator('.zone-tempo').getAttribute('data-tempo-live') !== 'on') problems.push(skin + ' tempo not visible');
      if (await page.locator('[data-metro]').count() < 1) problems.push(skin + ' metronome missing');
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.locator('.sheet [data-act="back-log"]').click();
      for (const tab of ['Routines', 'History', 'Stats']) {
        const named = tab === 'Stats'
          ? page.getByRole('button', { name: /^(Stats|Analytics)$/ })
          : page.getByRole('button', { name: tab, exact: true });
        await named.click();
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.locator('.sheet [data-act="back-log"]').click();
      }
      if (skin === 'starclassic') await page.getByRole('button', { name: 'Log', exact: true }).click();
      const overlap = await page.evaluate(() => {
        const root = document.querySelector('.classic') || document.querySelector('.zones');
        const nodes = [...root.querySelectorAll('button, input')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const hits = [];
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i].getBoundingClientRect();
          for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
            const b = nodes[j].getBoundingClientRect();
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (w > 6 && h > 6) hits.push((nodes[i].innerText || nodes[i].getAttribute('aria-label') || '').slice(0, 16) + ' / ' + (nodes[j].innerText || '').slice(0, 16));
          }
        }
        return hits.slice(0, 4);
      });
      if (overlap.length) problems.push(skin + ' overlap ' + overlap.join('; '));
      const miniBlocks = await page.evaluate(() => {
        const mini = document.getElementById('mini-root');
        const log = document.querySelector('.log-set');
        if (!mini || mini.hidden || !log) return false;
        const a = mini.getBoundingClientRect();
        const b = log.getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return w > 0 && h > 0;
      });
      if (miniBlocks) problems.push(skin + ' mini covers LOG SET');
    }
    await openSkin(page, 'starclassic');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('.set-card[data-cat="workout"]').click();
    await page.getByRole('button', { name: 'Duo off' }).click();
    await page.locator('.sheet [data-act="back-log"]').click();
    const weightField = page.locator('.ss-current [data-field="weight"], .entry [data-field="weight"]').first();
    await weightField.fill('111');
    await page.locator('.log-set').click();
    await page.waitForTimeout(500);
    const partner = await page.locator('.who-btn[aria-current="true"]').innerText();
    const weight = await page.locator('.ss-current [data-field="weight"], .entry [data-field="weight"]').first().inputValue();
    if (!/Robin/i.test(partner)) problems.push('duo did not switch: ' + partner);
    if (weight === '111') problems.push('duo kept the other partner weight');
  } finally {
    await browser.close();
  }
  assert.deepEqual(problems, []);
});

test('gamepad and Android key codes drive two skins', async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const problems = [];
  try {
    for (const skin of ['starclassic', 'transitline']) {
      await openSkin(page, skin);
      await page.evaluate(() => {
        let down = -1;
        navigator.getGamepads = () => {
          const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === down, value: i === down ? 1 : 0 }));
          return [{ id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', buttons, axes: [0, 0, 0, 0], mapping: 'standard', connected: true, index: 0, timestamp: Date.now() }];
        };
        window.__pad = (i) => { down = i; };
        window.dispatchEvent(new Event('gamepadconnected'));
      });
      await page.waitForTimeout(250);
      const before = await page.locator('.set-progress').innerText();
      await page.evaluate(() => window.__pad(0));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__pad(-1));
      await page.waitForTimeout(250);
      const after = await page.locator('.set-progress').innerText();
      if (before === after) problems.push(skin + ' gamepad A did not log');
      const glyphs = await page.locator('.pad-glyphs').count();
      if (!glyphs) problems.push(skin + ' glyphs hidden while controller active');
      await page.evaluate(() => {
        const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ButtonB' });
        Object.defineProperty(ev, 'keyCode', { get: () => 97 });
        document.dispatchEvent(ev);
      });
      if (await page.locator('.zone-rest').getAttribute('data-resting') === 'true') {
        await page.evaluate(() => {
          const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ButtonY' });
          Object.defineProperty(ev, 'keyCode', { get: () => 100 });
          document.dispatchEvent(ev);
        });
        if (await page.locator('.zone-rest').getAttribute('data-resting') !== 'false') problems.push(skin + ' Y did not skip rest');
      }
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(problems, []);
});
