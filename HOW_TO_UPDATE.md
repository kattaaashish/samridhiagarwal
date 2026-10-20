# How to update samridhiagarwal.com

This is for Samridhi. No code needed. Everything happens in the **admin dashboard** at
**https://samridhiagarwal.com/admin** (until the domain is connected:
https://samridhiagarwal-com.ak-projects.workers.dev/admin). Log in with the admin password.

## The golden rule

Everything you type is **saved automatically as a draft** ("Draft saved" appears at the top).
Nothing appears on the website until you press **Publish**. Once you press it, the change is
live straight away; just refresh the page.

Every item shows where it stands:

- **Draft**: only you can see it.
- **Live**: on the website.
- **Live · unpublished changes**: the website shows the older version. Press **Publish
  changes** to update it, or **Discard changes** to go back to what is live.

## Adding many artworks at once

1. **Artworks** → drag a **folder of photos** (or several photos, or videos) onto the box at
   the top. You can also press **Choose files** or **Choose a folder**.
2. Each photo becomes its **own artwork draft**, named from the file name. They are resized
   and compressed automatically, so you can use the original photos from your camera or phone.
3. Open each draft, add more photos and the details (below), then **Publish**.

iPhone photos in HEIC format can't be read by every browser. If one fails, export it as JPEG
first (Photos → Share → Save as JPEG, or set Camera → Formats → Most Compatible).

## Artwork details

- **Piece** tab: title, the moment behind the piece (two or three sentences in your own words,
  shown right beside the images), status (Available / Sold / Made to order), price in INR (optional; see *Prices* below),
  width, height and depth in **inches** (the site also shows the cm), materials, **Feature on home page**, and the Etsy link.
- **Photos & video** tab: drop more photos or videos in. The **first one is the main image**.
  Drag the dotted handle to reorder. For each picture you can:
  - write a short **description** (for people using screen readers, and for Google);
  - set its **Focus point**: click the part that must always stay visible. The site crops
    pictures to fit different screens and keeps this point in view. The preview shows how
    wide, phone and square crops will look.
- **Collections & occasions** tab: tick as many collections and gifting occasions as you like.

**Publish** checks the essentials first (the moment behind the piece, size and at least one
photo) and highlights anything missing.

## Prices

Prices are **hidden** on the whole site for now. To show them, go to **Site settings → Shop →
Show prices**, switch it on and press **Publish changes**. Pieces without a price never show
one. Sold pieces always say "Sold". The home page never shows prices.

## Marking a piece as sold

Open it → **Status** → *Sold* → **Publish changes**. The site shows a "Sold" badge, hides the
price and enquiry form, and offers "Commission a similar piece" instead.

To take a piece off the site but keep it, press **Unpublish**. **Delete** removes it for good.

## Collections and gifting occasions

- **Create**: **+ New collection**, give it a name, a short intro and a cover, then **Publish**.
  It appears in the menu, footer, filters and the *Browse by collection* row straight away.
- **Rename**: change the name and publish. The web address stays the same unless you press
  **Make from name** (old links would then stop working, so do this sparingly).
- **Reorder**: on the list, drag the dotted handle. The new order is live as soon as you let go.
- **Hide**: turn off **Show on site** and publish. It disappears from the site but nothing is
  deleted, and its artworks stay live.
- **Delete**: open it → **Delete**. Its **artworks stay on the site**; they just lose that
  grouping.
- **Seasonal occasions** (e.g. Diwali): set **Season starts** and **Season ends**. From 6 weeks
  before the start until the end, the occasion gets a "This season" badge on the Gifting pages.
  Update the dates each year.

## Exhibitions

**Exhibitions** → **+ New exhibition**: name, venue, city, start and end dates, description and
a photo gallery. Upcoming or past is worked out from the end date automatically, and upcoming
shows get a "notify me" sign-up.

## Journal posts

**Journal** → **+ New journal post**: title, date, one-line summary, cover, the artwork(s) the
story is about, then the **Story**: add paragraphs, headings and quotes with the buttons, drop
images into the box, and drag the handles to put everything in order.

## Testimonials

**Testimonials** → **+ New testimonial**: name, city, quote, and a photo of the art in their
home.

## Site settings

- **Home page**: tagline, artist statement (two lines), **hero videos** (up to 3; set a focus
  point on each so the artwork isn't cut off on phones), the **new collection teaser**, the
  **scrolling strip** phrases, and which journal post is featured.
- **Contact & social**: WhatsApp number (country code + number, digits only), email,
  Instagram, Etsy.
- **Footer FAQs**: care, framing, shipping and returns.
- **SEO**: site name, default page title and description, social share image.

The **About page** and **Commissions page** have their own entries under *Pages & settings*.

## Videos

Short silent loops of 3 to 4 seconds work best (landscape for the home page, portrait 4:5 for
artworks). Phone footage is fine; MP4 is the safest format. The limit is 95 MB per video, but
a short loop should be well under 10 MB, which also keeps the site fast.

## Where enquiries and sign-ups go

Both forms (contact/artwork enquiry and commission) email **hello@samridhiagarwal.com** once
email sending is set up. Commission photos are stored in Cloudflare R2
(`samridhiagarwal-uploads`). Email sign-ups ("Notify me") are saved in Cloudflare KV under
`SUBSCRIBERS`.
