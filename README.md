# samridhiagarwal.com

Video-first portfolio and enquiry site for contemporary artist Samridhi Agarwal.
Astro 5 · Tailwind v4 · own admin dashboard at `/admin` · Cloudflare Workers, D1, R2, KV, Turnstile · Resend.

- `PROJECT_BRIEF.md` — the brief, verbatim.
- `CLAUDE.md` — locked decisions and conventions (read before changing code).
- `HOW_TO_UPDATE.md` — plain-language editor guide for Samridhi.

## Local development

```bash
pnpm install
pnpm media:gen          # placeholder loops/posters for the seed content into public/media (needs ffmpeg)
pnpm db:migrate:local   # create the local D1 table
pnpm db:seed:local      # load seed/content.json into local D1
printf 'ADMIN_PASSWORD=local\nSESSION_SECRET=%s\n' "$(openssl rand -hex 32)" > .dev.vars
pnpm preview            # build + wrangler dev → http://localhost:8787 (admin: /admin)
```

`pnpm dev` (http://localhost:4321) also works and reads the same local D1 through the
Cloudflare platform proxy.

Checks:

```bash
pnpm check                          # astro check (types)
pnpm test                           # vitest: normaliser, admin back end, media URLs
pnpm screenshots                    # 375/768/1440 full-page screenshots against the preview
node scripts/interaction-check.mjs  # media rules, filters, lightbox, menu, forms, page weight
```

## Content

All content lives in Cloudflare **D1** (`documents` table, `migrations/`) and is edited at
**`/admin`**. Each row holds the published JSON the site renders and, separately, the draft
being edited. Pages render on request (`output: 'server'`), so Publish is live immediately.
`src/lib/data.ts` → `getSite(Astro.locals)` reads published rows once per request and runs them
through `src/lib/normalize.ts`. Without a `DB` binding (unit tests) it falls back to
`seed/content.json`.

Uploaded images are resized and compressed in the browser (480/960/1440/2048 px, WebP or JPEG)
and stored with videos in the R2 bucket `samridhiagarwal-media`, served from `/files/*`.

## Deploy

All deploys run from a maintainer's machine with Wrangler (no CI deploy):

```bash
pnpm build && npx wrangler versions upload   # preview URL to test
npx wrangler versions deploy <version-id>@100% -y   # make it live
```

First-time set-up of a fresh account (bindings are in `wrangler.toml`):

```bash
wrangler kv namespace create RATE_LIMIT      # paste id into wrangler.toml
wrangler kv namespace create SUBSCRIBERS     # paste id into wrangler.toml
wrangler r2 bucket create samridhiagarwal-uploads
wrangler r2 bucket create samridhiagarwal-media
wrangler d1 create samridhiagarwal           # paste id into wrangler.toml
pnpm db:migrate:remote && pnpm db:seed:remote
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET           # long random string
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put RESEND_API_KEY
```

## Redirects

`public/_redirects` holds old-site → new-site redirects (Cloudflare `_redirects` format). The
current entries are educated guesses; replace them with the real old URL inventory.
