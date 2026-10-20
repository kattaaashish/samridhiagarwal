# CLAUDE.md — samridhiagarwal.com

Locked decisions for this repo. Read before changing anything. The original brief is in
`PROJECT_BRIEF.md` (it predates the move off Sanity); editor instructions for Samridhi are in
`HOW_TO_UPDATE.md`.

## Stack (pinned, don't re-litigate)

- **Astro 5** (`astro@^5.18`), `output: 'server'`: every page renders on request in the Worker
  (**`@astrojs/cloudflare@^12`**) from content in D1, so a Publish in `/admin` is live at once.
  Built assets (CSS/JS/fonts/placeholder media) are served by Workers static assets. React is
  only used for the `/admin` dashboard.
- **Tailwind CSS v4** via `@tailwindcss/vite`. Tokens live in `src/styles/global.css` as
  CSS custom properties and are mapped into Tailwind with `@theme inline`. Components use
  utilities/tokens only — **no hex in components**.
- **Own admin dashboard** at `/admin` (no third-party CMS; Sanity was removed on 2026-10-09).
  Content types are defined once in `src/admin/schema.ts`; the dashboard builds its forms from
  them. Drag ordering via `@dnd-kit` (`orderRank` on collection and gifting occasion).
- **Cloudflare**: Workers hosting, **D1** for content, **R2** `samridhiagarwal-media` for
  uploaded images/videos and `samridhiagarwal-uploads` for commission photos, **KV** for per-IP
  rate limiting (forms and admin login) and newsletter sign-ups, **Turnstile** for forms.
  **Resend** for email.
- Package manager: **pnpm**. Node 22+.

## Data layer — documents in D1

`src/lib/data.ts` → `getSite(Astro.locals)` returns one normalised `Site` object, loaded once per
request (memoised on `locals`). Always pass `Astro.locals`.

- D1 table `documents` (`migrations/0001_documents.sql`): one row per document with `published`
  JSON (what the site shows) and `draft` JSON (unpublished edits). Documents keep the original
  shape: `{ _id, _type, ...fields }`, references `{ _ref }`, slugs `{ current }`.
- No `DB` binding (unit tests) → `seed/content.json`. `pnpm db:seed:local|remote` loads the seed
  into D1 with `INSERT OR IGNORE` (never overwrites edits).
- `src/lib/normalize.ts` resolves references **by id in JS**, so a dangling reference (deleted
  collection or occasion) is simply dropped and its artworks stay live. Hidden
  (`visible: false`) collections and occasions are removed everywhere (nav, filters, grids,
  artwork chips). Unit tested in `tests/normalize.test.ts`. Never delete or rewrite references
  on the server when a collection is deleted; keep this in `normalize.ts`.
- Nothing may assume a fixed count or fixed names of collections or occasions.

## Admin (`/admin`)

- Login: one password (`ADMIN_PASSWORD` secret) → HMAC-signed HttpOnly `SameSite=Strict` cookie
  (`SESSION_SECRET`), 30 days. Login attempts rate-limited in KV. `src/lib/admin/auth.ts`.
- API `src/pages/api/admin/*`, all wrapped by `adminRoute()` (session + same-origin check):
  docs list/create/get/save-draft/delete, `publish|unpublish|discard`, `reorder`, and
  `PUT /api/admin/files/site/<uuid>-<w>.<ext>` uploads (never overwrites; key pattern enforced).
- Publish validates required fields (`missingRequired` in `src/admin/schema.ts`) and assigns a
  unique slug per type. Reorder writes `orderRank` into draft and published (live at once).
- Bulk: dropping files or a folder on the Artworks list creates **one artwork draft per file**.
- Settings pages (`siteSettings`, `aboutPage`, `commissionsPage`) are singletons: id = type.

## Media model

`media` = `{ image (poster still, required), video?: { r2 }, alt }`. Uploaded images are
`{ r2: 'site/<uuid>', ext: 'webp'|'jpg', widths: [...], width, height, hotspot?: { x, y } }`;
every width in `widths` exists as `site/<uuid>-<w>.<ext>`. Seed documents use `image.localSrc`
and `localVideo` instead. `src/lib/media.ts` turns either into a `MediaRef`
`{ poster: { src, srcset, width, height }, video?: { mp4 }, alt, aspect, focus? }`.

- Resizing/compression happens **in the browser** at upload (`src/admin/media.ts`): widths
  480/960/1440/2048 below the original plus the original capped at 2048; WebP 0.82, or JPEG 0.85
  where the browser can't encode WebP (Safari). No server-side image service. Videos are stored
  as uploaded (≤95 MB) with a poster frame taken in the browser.
- `/files/[...key]` streams R2 objects with `immutable` caching and Range support (Safari video).
- `hotspot` (the "focus point" set in the dashboard) becomes `object-position` via `--focus`.
- **`src/components/Media.astro` is the only place a `<video>` or `<img>` for content is
  rendered.** It reserves the aspect-ratio box, always sets a poster, renders
  `muted loop playsinline preload="metadata"`, and `src/scripts/media.ts` (loaded once in the
  layout) handles reduced-motion / save-data / slow-connection fallback, IntersectionObserver
  lazy play/pause, and a max of 2 concurrently playing videos. `priority` media (hero) get
  real `src` attributes and `autoplay` so they play without JS; everything else has `data-src`.
- Placeholder media is generated by `pnpm media:gen` (ffmpeg) into `public/media/` from the
  `_gen` hints in `seed/content.json`. `public/media` is git-ignored; run the script after clone.

## Design tokens

| token | value |
|---|---|
| `--bg` | `#FBF8F3` |
| `--ink` | `#1F1B18` |
| `--accent` | `#C75B39` |
| `--accent-warm` | `#E8A33D` |
| `--leaf` | `#B8925A` |
| `--muted` | `#6B625B` (derived, secondary text; 5.6:1 on `--bg`) |
| `--accent-ink` | `#A3472A` (derived, terracotta for link text; 5.7:1) |
| `--accent-strong` | `#B85030` (derived, primary button fill; white text 4.97:1). `--accent` itself is decorative only (badges, hairlines, hover) |
| `--line` | `rgba(31,27,24,.12)` hairlines |

Fonts: `Fraunces Variable` (headings, `font-optical-sizing: auto`, `"SOFT" 30, "WONK" 0`),
`Inter Variable` (body). Self-hosted from `@fontsource-variable/*`, latin subset only, both
preloaded in `Base.astro`. Tailwind: `font-display`, `font-body`.

Motion: CSS only. `<ClientRouter />` view transitions; `.reveal` elements animate in via
`src/scripts/reveal.ts`. Every animation is inside `@media (prefers-reduced-motion: no-preference)`.

## Routes

`/` · `/work` · `/collections/[slug]` · `/artwork/[slug]` · `/gifting` · `/gifting/[slug]` ·
`/commissions` · `/exhibitions` · `/about` · `/journal` · `/journal/[slug]` · `/contact` ·
`/admin` · `/404` · `/sitemap-index.xml` (built from live content) · `/robots.txt`
API: `POST /api/enquiry` · `POST /api/commission` · `POST /api/subscribe` · `/api/admin/*` ·
`GET /files/*` · `GET /sent` (no-JS form confirmation) · `GET /whatsapp` (302 to the number in
Site settings; never hard-code it in `public/_redirects`).

Slug pages look the item up in `getSite()` and `return Astro.rewrite('/404')` when missing.
`trailingSlash: 'never'`. Use `pagePath(Astro.url)` from `src/lib/format.ts` for links,
canonicals and hidden form fields. `src/middleware.ts` adds the security headers that
`public/_headers` only applies to static assets.

Nav and footer submenus for Collections and Gifting are generated from the data layer.

## Forms

Plain `<form method="post" action="/api/…">` enhanced by `src/scripts/forms.ts` (fetch +
inline status). Server (`src/lib/forms/*`): honeypot → Turnstile verify → KV rate limit
(5/10 min per IP; 3 for commissions) → zod validation → R2 upload (commission photos, ≤5 files,
≤8 MB each, images only) → Resend email → JSON for `Accept: application/json` clients, or a 303 to
`/sent?form=…&back=…[&error=…]` for no-JS posts. Astro's `checkOrigin` CSRF protection stays on
(cross-site POSTs get 403).
If `TURNSTILE_SECRET_KEY` is unset (local dev) verification is skipped with a console warning;
if `RESEND_API_KEY` is unset the email is logged instead of sent.

## Buying seam

`src/components/BuyActions.astro` is the single place with enquire / WhatsApp / Etsy buttons.
A checkout would be added there and only there. No payment code anywhere.

## Conventions

- Files: components `PascalCase.astro`, scripts/libs `kebab-case.ts`. One component per file.
- Copy tone: warm, first person from Samridhi where it's her voice, short sentences.
- Prices are INR integers, formatted by `formatINR()` in `src/lib/format.ts`.
- Sizes are entered and stored in **inches** (`width`, `height`, optional `depth`, plus
  `sizeUnit: 'in'`). Documents without `sizeUnit` (seed, pre-2026-10-16) hold cm and are converted
  on read by `src/lib/size.ts`; never rewrite them in D1. `formatSize()` renders "24 × 36 in (61 × 91 cm)".
- Status enum: `available | sold | made-to-order`.
- Every page passes `title`, `description`, `image` to `Base.astro` for SEO/OG; JSON-LD via
  `<JsonLd>`.
- Run `pnpm check && pnpm test && pnpm build` before committing.
- Deploys are manual with Wrangler (`wrangler versions upload` → preview URL → `wrangler versions
  deploy`). There is no CI deploy.

## Change workflow

Samridhi requests changes in plain words; ask her when a requirement is unclear, and check with
Aashish for anything risky, paid, or architectural.

1. Local set-up once: `pnpm media:gen`, `pnpm db:migrate:local`, `pnpm db:seed:local`, and a
   `.dev.vars` with `ADMIN_PASSWORD` + `SESSION_SECRET` (git-ignored). If ffmpeg lacks libwebp,
   make the placeholder WebPs with `cwebp` instead.
2. Make the change, then `pnpm check && pnpm test && pnpm build`.
3. `wrangler dev` on :8787, then Playwright (`playwright-core` with local Chrome):
   `node scripts/interaction-check.mjs`, `pnpm screenshots`, plus targeted checks and
   viewport screenshots at 375 / 768 / 1440 of whatever changed. Look at the screenshots
   (full-page shots are too tall to judge). Check keyboard use, reduced motion, no horizontal
   scroll, and no console errors. For admin changes, exercise the flow end to end on local D1.
   Form tests hit the KV rate limit (5 per 10 min); clear `.wrangler/state/v3/kv` with the dev
   server stopped.
4. `wrangler versions upload` → send Samridhi the preview URL. **Preview versions share the
   production D1 and R2**: never create test content there; smoke-test read-only.
5. On approval: `wrangler versions deploy <id>@100% -y`, then commit and push to `main`.
   Schema changes go in a new `migrations/000N_*.sql`, applied with `pnpm db:migrate:remote`
   before deploying.

## Decisions log

- 2026-09-25: Astro pinned to 5.x even though 7.x exists, per brief; adapter 12.6.x matches.
- 2026-09-25: (superseded) Sanity CMS + Cloudflare Stream video.
- 2026-09-25: (superseded 2026-10-09) GitHub Actions rebuild-on-publish from a Sanity webhook.
- 2026-09-25: Newsletter sign-ups are stored in KV (`SUBSCRIBERS`) and emailed to Samridhi;
  no third-party list provider yet.
- 2026-09-25: (removed 2026-10-19 at Samridhi's request) "See it on a wall" scaled preview on artwork pages.
- 2026-09-25: `<video poster>` uses the smallest (480w) poster variant; the full-size poster is
  shown by the `<picture>` underneath. Avoids downloading two large stills per slot.
- 2026-09-25: Smooth scrolling is scoped to `html:focus-within` (keyboard/anchor use) rather
  than always on.
- 2026-09-25: Local placeholder posters are JPG + WebP only.
- 2026-10-09: Sanity removed at the owner's request ("we need to build our own"). Replaced by
  `/admin` on D1 + R2; pages render on request so publishing is instant. Admin login is a single
  password (chosen over Cloudflare Access). Images are resized in the browser so nothing needs
  a paid image service. Push-to-deploy CI removed; deploys are run with Wrangler.
- 2026-10-09: Home hero is full screen with the header overlaid (transparent until the hero
  text would pass under it); ticker phrases come from Site settings → Scrolling strip.
- 2026-10-16: Sizes switched to inches at Samridhi's request, shown with cm in brackets. Old cm
  documents are converted on read (no D1 migration), so preview versions on shared D1 stay correct.
- 2026-10-19: Home page artwork cards hide prices (`ArtworkCard showPrice={false}`); prices stay on
  /work, collections and artwork pages.
- 2026-10-19: Seasonal "Gifts for <occasion>" sections removed from the home page at Samridhi's
  request; season dates now only drive the "This season" badge on /gifting pages.
- 2026-10-19: Artwork filters are Collection and Size only (Occasion and Price removed at Samridhi's
  request).
- 2026-10-20: Prices hidden site-wide behind Site settings → Shop → `showPrices` (default off).
  Use `priceLabel(a, settings)` for any price slot; price is no longer required to publish.
