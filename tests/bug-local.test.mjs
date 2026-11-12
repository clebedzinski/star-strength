import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pageUrl = 'file://' + root + '/index.html';

test('bug reports stay on the device and never use the network', async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const problems = [];
  const net = [];
  try {
    const context = await browser.newContext({ timezoneId: 'America/New_York' });
    const page = await context.newPage({ viewport: { width: 390, height: 844 } });
    page.on('request', function (req) {
      const url = req.url();
      if (/^https?:/i.test(url)) net.push(req.method() + ' ' + url);
    });
    await page.goto(pageUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.welcome');
    await page.getByRole('button', { name: 'Skip welcome' }).click();
    await page.evaluate(() => {
      navigator.share = async (data) => { window.__shared = data; };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } });
    });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('.set-card[data-cat="about"]').click();
    await page.getByRole('tab', { name: 'Bugs' }).click();
    await page.locator('#bug-text').fill('The rest row wrapped.');
    await page.locator('#bug-steps').fill('Open Vinyl at 360.');
    await page.locator('#bug-severity').selectOption('high');
    await page.getByRole('button', { name: 'Save report' }).click();
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => (SICApp.state().settings.bugQueue || []).map((r) => r.happened));
    if (before.indexOf('The rest row wrapped.') < 0) problems.push('not saved ' + before.join('|'));
    await page.reload();
    await page.waitForSelector('.log-set');
    await page.evaluate(() => {
      navigator.share = async (data) => { window.__shared = data; };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } });
    });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('.set-card[data-cat="about"]').click();
    await page.getByRole('tab', { name: 'Bugs' }).click();
    const again = await page.locator('.bug-list').innerText();
    if (again.indexOf('The rest row wrapped.') < 0) problems.push('lost after reload');
    await page.evaluate(() => {
      SICApp.state().settings.bugQueue[0].created = Date.UTC(2026, 10, 12, 18, 43, 0);
    });
    await page.getByRole('tab', { name: 'About' }).click();
    await page.getByRole('tab', { name: 'Bugs' }).click();
    const shown = await page.locator('.bug-item strong').innerText();
    if (shown !== 'Nov 12, 1:43 PM') problems.push('local stamp ' + shown);
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.waitForTimeout(40);
    const shared = await page.evaluate(() => window.__shared && window.__shared.text);
    if (!shared || shared.indexOf('The rest row wrapped.') < 0 || shared.indexOf('Open Vinyl at 360.') < 0) problems.push('share ' + shared);
    if (shared && shared.indexOf('1.2.0') < 0) problems.push('share missing version');
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.waitForTimeout(40);
    const copied = await page.evaluate(() => window.__copied);
    if (copied !== shared) problems.push('copy mismatch');
    const toast = await page.locator('.toast').innerText();
    if (toast.indexOf('Copied') < 0) problems.push('toast ' + toast);
    await page.getByRole('button', { name: 'Share all' }).click();
    await page.waitForTimeout(40);
    const all = await page.evaluate(() => window.__shared && window.__shared.text);
    if (!all || all.indexOf('The rest row wrapped.') < 0) problems.push('share all');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(50);
    const left = await page.evaluate(() => (SICApp.state().settings.bugQueue || []).length);
    if (left !== 0) problems.push('delete left ' + left);
    if (net.length) problems.push('network ' + net.join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
  assert.deepEqual(problems, []);
});
