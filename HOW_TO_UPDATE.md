# How to update samridhiagarwal.com

This is for Samridhi. No code needed. Everything below happens in the **Studio**, which lives
at **https://samridhiagarwal.com/studio** (sign in with your Sanity account). The public site
rebuilds itself a few minutes after you press **Publish**.

## The golden rule

Nothing is live until you click the green **Publish** button at the bottom right of a document.
Until then it is a draft only you can see. After publishing, allow **2 to 4 minutes** for the site
to rebuild, then refresh the page.

## Adding an artwork

1. Studio → **Artworks** → **+** (top right) → choose *Artwork*.
2. Fill in the **Piece** tab:
   - **Title**, then click **Generate** next to *URL slug*.
   - **The moment behind the piece**: two or three sentences in your voice. This is the text that
     sits right beside the images, so make it count.
   - **Status**: Available, Sold, or Made to order.
   - **Price (INR)**, **Width**, **Height**, **Depth** in cm, **Materials**.
   - **Feature on home page**: on for your best available pieces (the home page shows up to six).
   - **Etsy listing URL**: paste the Etsy link if the piece is listed there. This shows a
     "Buy on Etsy" button for international buyers.
3. **Photos & video** tab → **Add item**. For each:
   - **Image**: drag a photo in. The **first item is the main image**. Add a close-up of the
     texture and a shot of the piece on a wall. Drag the handles to reorder.
   - **Alt text**: describe the picture in one sentence (for screen readers and Google).
   - **Cloudflare Stream video ID**: optional, see *Adding videos* below.
4. **Collections & occasions** tab: tick any number of each. A piece can be in several.
5. **Publish**.

You can drag many photos at once into the Studio's media area; each becomes an item.

## Marking a piece as sold

Open the artwork → **Status** → *Sold* → **Publish**. The site shows a "Sold" badge, hides the
price and enquiry form, and offers "Commission a similar piece" instead. Sold pieces stay
visible in collections so people can see your range. To hide a piece entirely, delete it or
remove all its collections and occasions (it will still be at its own URL).

## Adding videos (the looping clips)

Videos live in **Cloudflare Stream**, not in the Studio, because it handles compression and
mobile delivery for you.

1. Trim your clip to **3 to 4 seconds**, silent, ideally landscape for hero shots and portrait
   (4:5) for artworks. Phone footage is fine.
2. Go to Cloudflare Dashboard → **Stream** → **Upload**. Wait for "Ready".
3. Open the video → **Settings** → turn on **"Allow MP4 downloads"** (needed once per video).
4. Copy the **Video ID** (32 letters and numbers).
5. In the Studio, open the media slot (artwork photo, collection cover, hero video, etc.) and
   paste it into **Cloudflare Stream video ID**. Keep an image in the same slot: it is the
   poster shown before the video plays and on slow connections.
6. **Publish**.

Every visual slot on the site (hero, tiles, artwork galleries, collection and occasion covers,
journal covers, testimonials, about page footage) works this way: image required, video optional.

### Hero videos on the home page

Studio → **Site settings** → **Home page** → **Hero videos**. Up to three. The first plays
immediately; the others crossfade in. Reorder by dragging.

## Collections

Studio → **Collections (drag to reorder)**.

- **Create**: **+** → name, **Generate** slug, short intro, cover media → **Publish**. It appears
  in the *Work* menu, the footer, the *Browse by collection* row and the filters straight away.
- **Rename**: change **Name**. If you also want the web address to change, click **Generate**
  next to the slug (old links to the previous address will stop working, so do this sparingly).
- **Reorder**: drag the rows in the list. The order is used everywhere on the site.
- **Hide**: turn **Visible on site** off → **Publish**. The collection disappears from menus,
  filters and artwork pages, but nothing is deleted and its artworks stay live.
- **Delete**: open it → the **⋮** menu → **Delete**. The Studio will warn that artworks reference
  it. That is fine: **artworks are never deleted or unpublished** when a collection is deleted.
  They just lose that grouping.

## Gifting occasions

Studio → **Gifting occasions (drag to reorder)**. Same as collections, plus:

- **Season starts / Season ends**: optional dates. From **6 weeks before** *Season starts* until
  *Season ends*, the occasion is automatically featured on the home page with a "This season"
  badge. Update the dates each year (Diwali, Raksha Bandhan move every year). Leave them blank
  for occasions without a season (birthdays, anniversaries).

## Exhibitions

Studio → **Exhibitions** → **+**. Name, venue, city, start and end dates, short description, and
a photo gallery (installation shots, opening night). Whether a show appears under **Upcoming** or
**Past** is worked out from the end date. Upcoming shows get a "notify me" sign-up automatically.

## Journal posts ("the story behind the piece")

Studio → **Journal** → **+**. Title, date, one-line summary, cover media, then:

- **The piece(s) this story is about**: pick the artwork(s). The post links to them and the
  artwork page links back to the story.
- **Story**: write freely. Use *Heading* for section titles and the image button to drop in
  pictures.

The newest post is featured on the home page under "Story behind the piece" unless you pick a
different one in **Site settings → Home page**.

## Testimonials

Studio → **Testimonials** → **+**. Name, city, quote, and a photo of the art in their home.

## Site settings

Studio → **Site settings**.

- **Home page**: tagline, the two-line artist statement, hero videos, the *New collection
  teaser* (title, launch date, copy, on/off switch).
- **Contact & social**: WhatsApp number (country code + number, digits only, e.g.
  919876543210), email, Instagram, Etsy.
- **Footer FAQs**: care, framing, shipping and returns answers.
- **SEO**: default page title, description and social share image.

The **About page** and **Commissions page** have their own entries at the bottom of the list.

## Publishing changes

Click **Publish**. Within about 2 to 4 minutes the site rebuilds. If you don't see a change:

1. Refresh with **Shift + reload**.
2. Check the document is really published (no "Publish" button lit up, no "draft" chip).
3. Check GitHub → **Actions** for a red "Deploy" run, and forward the link to whoever maintains
   the site.

## Where enquiries go

Both forms (contact/artwork enquiry and commission) email **the address set in NOTIFY_EMAIL**
(currently hello@samridhiagarwal.com) with a readable summary. Commission photos are stored in
the **Cloudflare R2** bucket `samridhiagarwal-uploads` and linked from the email. Email sign-ups
are stored in Cloudflare KV under `SUBSCRIBERS` and also emailed to you.
