# Project brief — samridhiagarwal.com

_This is the original brief, kept verbatim so later sessions can check work against it. Locked implementation decisions live in `CLAUDE.md`._

## The artist

Samridhi Agarwal, contemporary artist. Work is drawn from everyday moments, thoughts and
feelings — ordinary life turned into art. Pieces are handmade, expressive strokes, often
with gold and silver leaf.

## Purpose

Let visitors feel the emotion and story behind each piece, connect with Samridhi as a
person, and easily commission or enquire.

## Audience

Indian homeowners and NRI buyers; people buying meaningful art for weddings, a new home,
or kids leaving for college. Most arrive from Instagram, on a phone.

## Feel

Human, joyful, contemporary. Personal and intimate — an artist's visual diary, or stepping
into a bright studio. Warm, not gallery-cold. Each piece is a small story.

## Video-first — read this before building any component

This is a video-first site. Every visual placeholder is a **3–4 second silent looping
video**, not a still. Build one `<Media>` component used everywhere (hero, tiles, grids,
artwork galleries, journal covers, about, testimonials) that takes either a video or an
image from the CMS and handles:

- `autoplay muted loop playsinline preload="metadata"`, poster frame always set
- Falls back to the poster still when `prefers-reduced-motion: reduce`, on `save-data`,
  or on a slow `navigator.connection` effectiveType
- Lazy-plays via IntersectionObserver; pauses off-screen. Never more than ~2 videos
  decoding at once
- Correct aspect-ratio box reserved up front — zero layout shift
- Placeholder videos generated locally (short generated/ambient clips or ffmpeg-made
  loops from placeholder stills) so every slot is filled and swappable from the CMS

## Visual direction

Layout inspired by kateflorence.com: video hero, large tiles, a bold short artist
statement, minimal text, artwork always the hero, generous whitespace, gentle animation.

**Palette** (tokens in CSS custom properties, never hard-coded hex in components):

| token | value | use |
|---|---|---|
| `--bg` | `#FBF8F3` warm off-white | page |
| `--ink` | `#1F1B18` deep charcoal | text |
| `--accent` | `#C75B39` terracotta | primary accent, buttons, links |
| `--accent-warm` | `#E8A33D` marigold | secondary highlights, seasonal badges |
| `--leaf` | `#B8925A` gold | hairlines, shimmer, sparingly only |

**Type:** `Fraunces` (variable, use optical sizing + a low `wonk`/`soft` setting) for
headings; `Inter` for body. Self-host via Fontsource, subset latin, `font-display: swap`,
preload the two weights actually used.

**Motion:** CSS-first. Astro view transitions for route changes, scroll-reveal via
`IntersectionObserver` + CSS, no animation library. Everything respects
`prefers-reduced-motion`.

## Stack — decided, don't re-litigate

- **Astro 5**, static-first with islands. Zero client JS by default.
- **Tailwind CSS v4** over the token layer above.
- **Sanity** as CMS, Studio embedded at `/studio`. Sanity's asset pipeline handles
  bulk drag-and-drop upload, `@sanity/orderable-document-list` for drag reordering, and
  `@sanity/image-url` for on-the-fly resize/compress/format (AVIF/WebP, responsive
  `srcset`).
- **Cloudflare** for everything runtime: Workers (`@astrojs/cloudflare`) for hosting and
  the form endpoints, **Stream** for video (HLS + MP4 fallback + poster), **Turnstile**
  for form spam protection, **R2** for commission-enquiry photo uploads.
- **Resend** for transactional email from the Worker.
- Sanity webhook → Cloudflare deploy hook so publishing content rebuilds the site.
- No payment integration anywhere. Buying is: Etsy link (`artbysamridhiagarwal`) for
  international, and an enquiry/WhatsApp path for India. Leave a clean seam where a
  checkout can be dropped in later, but build nothing for it.

Mobile-first, fast (target LCP < 2.0s on 4G), strong SEO.

## Pages and routes

`/` Home · `/work` Originals · `/collections/[slug]` · `/artwork/[slug]` ·
`/gifting` and `/gifting/[slug]` · `/commissions` · `/exhibitions` · `/about` ·
`/journal` and `/journal/[slug]` · `/contact` · `/studio`

**Header nav:** Work (Originals, Collections, Gifting, Commissions) · Exhibitions ·
About · Journal · Contact. The Collections and Gifting submenus are generated from Sanity
at build time — adding or renaming one updates the menu with no code change.

**Footer:** care & framing FAQs, shipping, returns, contact, Instagram, WhatsApp.
Plus a floating WhatsApp button on every page.

### Home

- Hero: looping studio videos — light moving across gold and silver leaf, hands at work,
  the everyday moments behind pieces. Swappable from Site Settings.
- "New collection" teaser with launch date and a "be the first to know" email sign-up.
- Four large clickable tiles: Original Artworks (Shop now), Gifting (Explore),
  Exhibitions (Explore), Commissions (Start yours).
- Bold two-line artist statement about turning everyday moments, thoughts and feelings
  into art.
- "Story behind the piece" block linking to a journal post.
- Testimonials with photos of the art in clients' homes.
- If a gifting occasion's seasonal dates fall within the next ~6 weeks, feature it here
  automatically.

Text minimal, images lead, phone-perfect.

### Collections / work

Collection page: Samridhi's short intro, then a grid of artworks. Filters by collection,
occasion, size and price range — collection and occasion filter options generated from
Sanity, never hard-coded, and the filter UI must handle zero, one, or twenty of them.

### Artwork page

- Multiple photos and videos: close-up texture shots, the piece on a real wall.
- **The personal note — the moment, thought or feeling behind the piece — sits prominently
  right beside the images**, not buried with the specs.
- Title, size, materials, price in INR, buttons to enquire (WhatsApp / form) and to buy on
  Etsy where a link exists.
- Pinch/scroll zoom on photos so texture and leaf detail are visible.
- Subtle shimmer on hover that echoes how gold and silver leaf catch light.
- "See it on a wall" preview: the piece composited into a styled room, scaled from its
  real dimensions.
- Clear "Sold" / "Made to order" state.
- "You might also like" row of related pieces (shared collection or occasion).

### Exhibitions

Newest first. Name, venue, city, dates, short description, photo gallery with a lightbox
(installation shots, work on display, opening-night moments). "Upcoming exhibitions"
section at the top with a notify-me sign-up.

### Commissions

Friendly step-by-step of how custom work happens, typical timelines, what to share
(wall size, photos of the space, colours, the moment or feeling to capture, occasion,
budget, deadline), and an enquiry form with photo upload to R2.

### Contact

General enquiry form, WhatsApp link, email, Instagram.

### Gifting

Pieces grouped by occasion, generated entirely from Sanity. Gift-wrapping and
personal-note options on the enquiry. Seasonal occasions surface on the home page near
their dates.

### About

How everyday moments, thoughts and feelings become the art, with a worked example of a
real moment and the piece it inspired. Studio footage of hands and tools; raw material →
finished piece, told visually.

### Journal

List plus post page. Posts framed as "the story behind the piece": a short reflection
pairing a moment from life with the artwork it became, linking to that piece.

## Content model (Sanity)

- **Artwork** — title, slug, images (multiple), video, collections (many), gifting
  occasions (many), size, materials, price INR, the moment/thought/feeling behind it
  (short personal note), status (available / sold / made to order), featured toggle,
  Etsy link, SEO fields.
- **Collection** — name, short intro, cover media, display order, visible toggle.
  Createable, renameable, reorderable, hideable, deletable by the artist. An artwork can
  be in several. **Deleting a collection must not delete or unpublish its artworks** —
  they stay live and simply lose that grouping. Use weak references, and handle a dangling
  reference without a build failure.
- **Gifting occasion** — name, short intro, cover media, display order, visible toggle,
  optional seasonal start/end dates for home-page featuring. Same create/rename/reorder/
  hide/delete freedom and same weak-reference safety. An artwork can be in several
  occasions and in collections at the same time.
- **Exhibition** — name, venue, city, start/end dates, description, photo gallery,
  upcoming/past derived from dates.
- **Journal post** — title, slug, cover media, portable-text body, inline images, linked
  artworks.
- **Testimonial** — client name, city, quote, photo.
- **Site settings** (singleton) — artist statement, hero videos, new-collection teaser
  (title, date, copy), social links, WhatsApp number, default SEO/OG.

Nothing in the design may assume a fixed number or fixed names of collections or
occasions — that applies site-wide.

Seed sample content so the site is fully populated on first run:
- Collections: Everyday Moments, Quiet Thoughts, Big Feelings, Home and Belonging,
  Celebrations
- Occasions: Diwali, Weddings, Griha Pravesh, Raksha Bandhan, Anniversaries, Birthdays
- Plus ~10 artworks, 2 exhibitions, 3 journal posts, 4 testimonials.

## Forms

Both forms POST to Cloudflare Worker endpoints, validate server-side, verify Turnstile,
rate-limit per IP, store commission photos in R2, and email Samridhi via Resend with a
readable summary plus attachment links. Return proper success/error states without a full
page reload, and degrade to a normal form POST without JS.

## Polish pass (do this, don't just claim it)

- Verify every page at 375 / 768 / 1440 widths.
- Responsive `srcset`/`sizes` everywhere, AVIF+WebP, Stream-encoded video, everything
  heavy compressed. Check the real transferred bytes of the home page.
- Titles, meta descriptions, alt text, canonicals, `sitemap.xml`, `robots.txt`, JSON-LD
  (`VisualArtwork`, `Person`, `Event` for exhibitions), and OG/Twitter images that render
  correctly in Instagram and WhatsApp previews.
- Accessibility: contrast ≥ 4.5:1 for body text, full keyboard nav, visible focus rings,
  labelled controls, real alt text, lightbox and zoom reachable by keyboard and escapable.
- Click through every link, form and button.
- Prove the CMS-driven parts: add, rename, reorder, hide and delete a collection and an
  occasion, and confirm nav, filters, grids and artwork pages all update correctly and
  that deleting one orphans nothing.

## Deploy

Wire up Cloudflare Workers deployment (`wrangler.toml`, build config, env/secret list),
the Sanity → Cloudflare deploy-hook webhook, and redirects from the old site's URLs to
their new equivalents.

Then write `HOW_TO_UPDATE.md` in plain language covering: adding artworks, exhibitions,
videos and journal posts; creating, renaming, reordering, hiding and deleting collections
and gifting occasions; marking pieces sold; and publishing changes.

## What you need from me

At the end, give me one short list of exactly what I have to do by hand — accounts to
create, secrets to set, DNS records, the old-site URL inventory for redirects — plus
anything you couldn't finish and why. Everything else, do yourself.
