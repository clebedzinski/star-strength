import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pageUrl = 'file://' + root + '/index.html';

test('welcome, about, bug share, xml, autosave, and finish', async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const problems = [];
  try {
    const fresh = await browser.newContext();
    const page = await fresh.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.goto(pageUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.welcome');
    const welcome = await page.locator('.welcome').innerText();
    if (!/Strength in Character/.test(welcome) || !/BE YOUR OWN BIGGEST FAN/.test(welcome)) problems.push('welcome copy ' + welcome.slice(0, 80));
    if (!/LOG SET/.test(welcome) || !/Duo/.test(welcome) || !/Rest/.test(welcome)) problems.push('welcome tips missing');
    if (!/sample routine/i.test(welcome)) problems.push('sample routine not mentioned');
    const blocked = await page.locator('.log-set').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + 4, r.top + 4);
      return top && !el.contains(top) && top !== el;
    });
    if (blocked) problems.push('welcome blocks LOG SET');
    await page.getByRole('button', { name: 'Skip welcome' }).click();
    if (await page.locator('.welcome').count()) problems.push('welcome stayed after skip');
    await page.reload();
    await page.waitForSelector('.log-set');
    if (await page.locator('.welcome').count()) problems.push('welcome returned');
    if (await page.locator('.overlay').count()) problems.push('whats new blocked after welcome');

    await page.locator('[data-field="weight"]').first().fill('77');
    await page.waitForTimeout(700);
    await page.reload();
    await page.waitForSelector('[data-field="weight"]');
    const kept = await page.locator('[data-field="weight"]').first().inputValue();
    if (kept !== '77') problems.push('autosave lost weight ' + kept);

    const xml = await page.evaluate(() => {
      const state = SICApp.state();
      const before = Object.keys(state.routines).sort().join(',');
      const text = SIC.exportXml(state, 'bundle', { now: Date.now(), units: 'lb' });
      const parsed = SIC.importXml(text);
      const after = parsed && parsed.ok ? Object.keys(parsed.doc.routines).sort().join(',') : '';
      return { ok: parsed && parsed.ok && after === before, bench: text.indexOf('Barbell Bench Press') >= 0, errors: parsed && parsed.errors };
    });
    if (!xml.ok || !xml.bench) problems.push('xml round trip ' + JSON.stringify(xml));

    await page.locator('.log-set').click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Tempo on' }).click();
    await page.locator('[data-act="finish"]').click();
    await page.locator('.sheet [data-act="finish-go"]').click();
    await page.waitForTimeout(100);
    const finished = await page.evaluate(() => {
      const state = SICApp.state();
      return {
        summary: !!document.querySelector('.overlay h2'),
        rest: state.rest.batman.endAt === 0 && state.rest.robin.endAt === 0,
        tempo: state.settings.tempo.running === false
      };
    });
    if (!finished.summary || !finished.rest || !finished.tempo) problems.push('finish ' + JSON.stringify(finished));

    await page.locator('.sheet .primary').click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('.set-card[data-cat="appearance"]').click();
    const beta = await page.locator('.skin-pick button', { hasText: 'Beta look' }).count();
    const classicBeta = await page.locator('.skin-pick button', { hasText: 'Star Strength Classic' }).innerText();
    const pixel = await page.locator('.skin-pick button', { hasText: 'Pixel Forecast' }).innerText();
    const iron = await page.locator('.skin-pick button', { hasText: 'Iron Dial' }).innerText();
    if (beta !== 0) problems.push('beta count ' + beta);
    if (/Beta look/.test(classicBeta) || /Beta look/.test(pixel) || /Beta look/.test(iron)) problems.push('finished skin marked beta');

    await page.locator('[data-act="settings-back"]').click();
    await page.locator('.set-card[data-cat="about"]').click();
    const about = await page.locator('.sheet').innerText();
    if (!/1\.1\.0/.test(about)) problems.push('about version');
    if (!/Ryan "ryno"/.test(about)) problems.push('about credit');
    if (!/stays on this device/i.test(about)) problems.push('about privacy');
    await page.getByRole('tab', { name: 'Bugs' }).click();
    const bugs = await page.locator('.sheet').innerText();
    if (!/Reports stay on this phone\. Tap Share to send one by text, email or any app, or Copy to paste it anywhere\./.test(bugs)) problems.push('bug note');
    if (await page.getByRole('button', { name: 'Submit' }).count()) problems.push('submit still shown');
    await page.locator('#bug-text').fill('The rest bar overlapped Finish.');
    await page.getByRole('button', { name: 'Save report' }).click();
    await page.evaluate(() => { navigator.share = async (data) => { window.__shared = data; }; });
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.waitForTimeout(50);
    const shared = await page.evaluate(() => ({
      text: window.__shared && window.__shared.text,
      queued: (SICApp.state().settings.bugQueue || []).length
    }));
    if (!shared.text || shared.text.indexOf('Reports stay on this phone') < 0) problems.push('share text');
    if (!shared.queued) problems.push('bug not saved');
    await fresh.close();
  } finally {
    await browser.close();
  }
  assert.deepEqual(problems, []);
});
