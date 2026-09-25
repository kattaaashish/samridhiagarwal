# samridhiagarwal.com

Video-first portfolio and enquiry site for contemporary artist Samridhi Agarwal.
Astro 5 · Tailwind v4 · Sanity Studio at `/studio` · Cloudflare Workers, Stream, Turnstile, R2, KV · Resend.

- `PROJECT_BRIEF.md` — the brief, verbatim.
- `CLAUDE.md` — locked decisions and conventions (read before changing code).
- `HOW_TO_UPDATE.md` — plain-language editor guide for Samridhi.

## Local development

```bash
pnpm install
pnpm media:gen        # generate placeholder loops/posters into public/media (needs ffmpeg)
cp .env.example .env  # optional; with no Sanity project the site runs on seed/content.json
pnpm dev              # http://localhost:4321
```

Production-like preview (Worker + assets + KV/R2 emulation):

```bash
pnpm build && pnpm preview   # http://localhost:8787
```

Checks:

```bash
pnpm check                          # astro check (types)
pnpm test                           # vitest: normaliser / CMS behaviour
pnpm screenshots                    # 375/768/1440 full-page screenshots against the preview
node scripts/interaction-check.mjs  # media rules, filters, lightbox, menu, forms, page weight
```

## Content

`src/lib/data.ts` loads all content from Sanity when `PUBLIC_SANITY_PROJECT_ID` is set, otherwise
from `seed/content.json`. Both go through `src/lib/normalize.ts`, which resolves references by id
so deleted or hidden collections/occasions drop out without breaking anything.

Seed a fresh Sanity dataset (uploads the placeholder images as assets):

```bash
PUBLIC_SANITY_PROJECT_ID=xxxx pnpm seed:import
```

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and runs `wrangler deploy` on push to
`main` and on `repository_dispatch` (type `sanity-publish`) from the Sanity webhook.
Manual: `pnpm deploy`.

Set once (see `wrangler.toml` for bindings):

```bash
wrangler kv namespace create RATE_LIMIT      # paste id into wrangler.toml
wrangler kv namespace create SUBSCRIBERS     # paste id into wrangler.toml
wrangler r2 bucket create samridhiagarwal-uploads
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put SANITY_READ_TOKEN        # only for a private dataset
```

Sanity → rebuild webhook: Sanity project → API → Webhooks → URL
`https://api.github.com/repos/OWNER/REPO/dispatches`, method POST, header
`Authorization: Bearer <GitHub fine-grained token with "Contents: read & write">`,
`Accept: application/vnd.github+json`, body `{"event_type":"sanity-publish"}`, trigger on
create/update/delete, projection left empty.

## Redirects

`public/_redirects` holds old-site → new-site redirects (Cloudflare `_redirects` format). The
current entries are educated guesses; replace them with the real old URL inventory.
