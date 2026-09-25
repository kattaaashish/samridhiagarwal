#!/usr/bin/env node
/** Full-page screenshots of every route at 375 / 768 / 1440 using local Chrome. */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://localhost:8787';
const routes = (process.env.ROUTES ?? '/,/work,/collections/everyday-moments,/artwork/chai-at-six,/gifting,/gifting/diwali,/commissions,/exhibitions,/about,/journal,/journal/chai-at-six,/contact,/404-test').split(',');
const widths = [375, 768, 1440];
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 812 : 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  for (const route of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const res = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const file = `screenshots/${width}${route.replace(/\//g, '_') || '_home'}.png`;
    await page.screenshot({ path: file, fullPage: true });
    results.push({ width, route, status: res?.status(), overflow, errors: errors.slice(0, 3) });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.table(results);
if (results.some((r) => r.overflow || r.errors.length || (r.status !== 200 && !r.route.includes('404')))) process.exitCode = 1;
