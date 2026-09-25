#!/usr/bin/env node
/** Behavioural checks against a running preview: media rules, filters, lightbox, menu, forms, page weight. */
import { chromium } from 'playwright-core';
const base = process.env.BASE_URL ?? 'http://localhost:8787';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = {};
const check = (name, cond, detail = '') => { out[name] = (cond ? 'PASS' : 'FAIL') + (detail ? ` (${detail})` : ''); };

// --- Page weight of home on a cold load (bytes actually transferred, same-origin) ---
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Network.enable');
  const sizes = new Map(); const types = {};
  client.on('Network.responseReceived', (e) => { types[e.requestId] = { type: e.type, url: e.response.url }; });
  client.on('Network.loadingFinished', (e) => { sizes.set(e.requestId, e.encodedDataLength); });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  let total = 0; const byType = {};
  for (const [id, n] of sizes) { const t = types[id]?.type ?? 'Other'; if (types[id]?.url.startsWith(base)) { total += n; byType[t] = (byType[t] ?? 0) + n; } }
  out['home_transfer_kb_initial_viewport'] = Math.round(total / 1024) + ' KB ' + JSON.stringify(Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024) + 'KB'])));
  const lcp = await page.evaluate(() => new Promise((r) => { new PerformanceObserver((l) => r(l.getEntries().at(-1)?.startTime)).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => r(null), 1000); }));
  out['home_lcp_ms_local'] = lcp && Math.round(lcp);
  const cls = await page.evaluate(() => new Promise((r) => { let s = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(s), 500); }));
  check('home_cls_zero', cls < 0.01, `CLS=${cls.toFixed(4)}`);
  const heroPlaying = await page.evaluate(() => Array.from(document.querySelectorAll('video')).filter((v) => !v.paused && v.currentTime > 0).length);
  check('hero_video_autoplays', heroPlaying >= 1, `${heroPlaying} playing`);
  await ctx.close();
}

// --- ≤2 concurrent videos on the grid page after scrolling ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/work', { waitUntil: 'networkidle' });
  await page.evaluate(() => scrollTo(0, 1600)); await page.waitForTimeout(1500);
  const playing = await page.evaluate(() => Array.from(document.querySelectorAll('video')).filter((v) => !v.paused).length);
  check('max_two_videos_playing', playing <= 2 && playing >= 1, `${playing} playing`);
  const loaded = await page.evaluate(() => document.querySelectorAll('video[data-loaded]').length);
  const totalV = await page.evaluate(() => document.querySelectorAll('video').length);
  check('videos_lazy_loaded', loaded < totalV, `${loaded}/${totalV} sources attached`);
  // Filters
  const before = await page.locator('[data-artwork]:visible').count();
  await page.getByLabel('Sold').count(); // no-op
  await page.locator('form[data-filters] input[name=occasions]').first().check({ force: true });
  await page.waitForTimeout(200);
  const after = await page.locator('[data-artwork]:visible').count();
  check('filter_reduces_grid', after < before && after > 0, `${before} → ${after}`);
  check('filter_syncs_url', page.url().includes('occasions='), page.url());
  await page.locator('form[data-filters] button[type=reset]').click();
  await page.waitForTimeout(200);
  check('filter_clear_restores', (await page.locator('[data-artwork]:visible').count()) === before);
  await ctx.close();
}

// --- Reduced motion → no <video> in DOM ---
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  const n = await page.evaluate(() => document.querySelectorAll('video').length);
  const posters = await page.evaluate(() => document.querySelectorAll('[data-media] img').length);
  check('reduced_motion_posters_only', n === 0 && posters > 0, `${n} videos, ${posters} posters`);
  await ctx.close();
}

// --- Lightbox keyboard: Enter opens, arrows navigate, Escape closes, focus returns ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/artwork/chai-at-six', { waitUntil: 'networkidle' });
  const btn = page.locator('[data-lightbox]').first();
  await btn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  check('lightbox_opens_by_keyboard', await page.locator('dialog[open]').count() === 1);
  const cap1 = await page.locator('[data-lb-caption]').textContent();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  const cap2 = await page.locator('[data-lb-caption]').textContent();
  check('lightbox_arrow_navigates', cap1 !== cap2, `${cap1} → ${cap2}`);
  await page.keyboard.press('+'); await page.waitForTimeout(100);
  const transform = await page.locator('[data-lb-img]').evaluate((el) => el.style.transform);
  check('lightbox_zoom_keyboard', /scale\(1\.5/.test(transform), transform);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check('lightbox_escape_closes', await page.locator('dialog[open]').count() === 0);
  check('lightbox_focus_returns', await page.evaluate(() => document.activeElement?.hasAttribute('data-lightbox')));
  // Wall preview scaled
  const w = await page.locator('.wall-piece').evaluate((el) => el.style.width);
  check('wall_preview_scaled', w === '16.67%', w);
  // JSON-LD present
  const ld = await page.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']);
  check('artwork_jsonld', ld === 'VisualArtwork', ld);
  // JS form submit shows inline message
  await page.fill('form[action="/api/enquiry"] input[name=name]', 'Playwright Tester');
  await page.fill('form[action="/api/enquiry"] input[name=email]', 'pw@example.com');
  await page.fill('form[action="/api/enquiry"] textarea[name=message]', 'Testing the enquiry form end to end from a browser.');
  await page.click('form[action="/api/enquiry"] button[type=submit]');
  await page.waitForTimeout(1500);
  const statusText = await page.locator('form[action="/api/enquiry"] [data-form-status]').textContent({ timeout: 3000 }).catch(() => 'NOT FOUND, url=' + page.url());
  check('form_inline_success', /on its way|Too many/.test(statusText ?? ''), statusText?.trim());
  await ctx.close();
}

// --- Mobile menu ---
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.click('[data-menu-toggle]'); await page.waitForTimeout(200);
  check('mobile_menu_opens', await page.locator('[data-header][data-open="true"]').count() === 1);
  await page.click('[data-submenu-toggle]'); await page.waitForTimeout(100);
  const links = await page.locator('#submenu-work a').allTextContents();
  check('submenu_lists_collections_and_occasions', links.includes('Everyday Moments') && links.includes('Diwali'), `${links.length} links`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  check('mobile_menu_escape_closes', await page.locator('[data-header][data-open="false"]').count() === 1);
  await ctx.close();
}

// --- No-JS: forms still post and land on /sent ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/contact');
  const vids = await page.locator('video[autoplay]').count();
  check('nojs_posters_visible', (await page.locator('[data-media] img').count()) > 0, `${vids} autoplay videos`);
  await page.fill('form[action="/api/enquiry"] input[name=name]', 'No JS');
  await page.fill('form[action="/api/enquiry"] input[name=email]', 'nojs@example.com');
  await page.fill('form[action="/api/enquiry"] textarea[name=message]', 'Submitting without JavaScript enabled at all.');
  await page.click('form[action="/api/enquiry"] button[type=submit]', { force: true }); // no JS → no rAF for stability checks
  await page.waitForURL('**/sent**', { timeout: 15000 }); await page.waitForLoadState('load'); await page.waitForTimeout(500);
  check('nojs_form_lands_on_sent', page.url().includes('/sent?form=enquiry'), page.url());
  check('nojs_sent_page_has_message', /Thank you|Too many/.test(await page.content()));
  await ctx.close();
}

await browser.close();
console.table(out);
if (Object.values(out).some((v) => String(v).startsWith('FAIL'))) process.exitCode = 1;
