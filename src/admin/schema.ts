/**
 * Content types edited in /admin. The dashboard builds its forms from these definitions and
 * the server uses them for slugs. Stored documents keep the shape normalize.ts reads
 * (references are { _ref }, slugs are { current }, media is { image, video?, alt }).
 */

export const CONTENT_TYPES = ['artwork', 'collection', 'occasion', 'exhibition', 'post', 'testimonial', 'siteSettings', 'aboutPage', 'commissionsPage'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
/** One fixed document each; the document id equals the type name. */
export const SINGLETONS = new Set<ContentType>(['siteSettings', 'aboutPage', 'commissionsPage']);

interface Base {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  group?: string;
}
export type Field =
  | (Base & { type: 'string' | 'url' | 'date' | 'boolean' })
  | (Base & { type: 'text'; rows?: number; max?: number })
  | (Base & { type: 'number'; min?: number })
  | (Base & { type: 'select'; options: { value: string; label: string }[]; initial?: string })
  | (Base & { type: 'slug'; source: string })
  /** One image or looping video (poster + video). */
  | (Base & { type: 'media' })
  /** Many images/videos: drag a folder in, drag to reorder. */
  | (Base & { type: 'mediaList'; max?: number; min?: number })
  /** A plain image (no video), e.g. the social share image. */
  | (Base & { type: 'image' })
  | (Base & { type: 'ref'; to: ContentType })
  | (Base & { type: 'refs'; to: ContentType })
  | (Base & { type: 'stringList'; itemLabel?: string })
  | (Base & { type: 'objectList'; itemLabel: string; fields: Field[] })
  | (Base & { type: 'object'; fields: Field[] })
  /** Journal story: paragraphs, headings, quotes and images in order. */
  | (Base & { type: 'blocks' });

export interface TypeDef {
  label: string;
  plural: string;
  /** Field shown as the item's name in lists */
  titleField: string;
  /** Field holding the list thumbnail (media, mediaList or image) */
  thumbField?: string;
  orderable?: boolean;
  groups?: string[];
  fields: Field[];
  /** Short line under the list heading */
  intro?: string;
}

const visible: Field = { name: 'visible', label: 'Show on site', type: 'boolean', help: 'Turn off to hide it everywhere without deleting it. Its artworks stay live.' };

export const TYPES: Record<ContentType, TypeDef> = {
  artwork: {
    label: 'Artwork',
    plural: 'Artworks',
    titleField: 'title',
    thumbField: 'media',
    groups: ['Piece', 'Photos & video', 'Collections & occasions', 'SEO'],
    intro: 'Drop a folder of photos to create one draft per photo, then fill in each one and publish.',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true, group: 'Piece' },
      { name: 'slug', label: 'Web address', type: 'slug', source: 'title', group: 'Piece', help: 'Made from the title when you publish. Changing it later breaks old links.' },
      { name: 'note', label: 'The moment behind the piece', type: 'text', rows: 4, max: 600, required: true, group: 'Piece', help: 'The moment, thought or feeling that became this piece. Two or three sentences, in your own words. Shown right beside the images.' },
      { name: 'status', label: 'Status', type: 'select', initial: 'available', group: 'Piece', options: [{ value: 'available', label: 'Available' }, { value: 'sold', label: 'Sold' }, { value: 'made-to-order', label: 'Made to order' }] },
      { name: 'price', label: 'Price (INR)', type: 'number', min: 0, group: 'Piece', help: 'Optional. Only shown when Site settings → Shop → Show prices is on.' },
      { name: 'width', label: 'Width (inches)', type: 'number', min: 0, required: true, group: 'Piece' },
      { name: 'height', label: 'Height (inches)', type: 'number', min: 0, required: true, group: 'Piece' },
      { name: 'depth', label: 'Depth (inches)', type: 'number', min: 0, group: 'Piece' },
      { name: 'materials', label: 'Materials', type: 'string', group: 'Piece', help: 'e.g. Acrylic and gold leaf on canvas' },
      { name: 'featured', label: 'Feature on home page', type: 'boolean', group: 'Piece', help: 'The home page shows up to four featured pieces that are not sold, in one row.' },
      { name: 'etsyUrl', label: 'Etsy link', type: 'url', group: 'Piece', help: 'Optional. Shows a "Buy on Etsy" button for international buyers.' },
      { name: 'media', label: 'Photos & video', type: 'mediaList', min: 1, required: true, group: 'Photos & video', help: 'The first one is the main image. Add close-ups and a photo on a wall. Drag to reorder.' },
      { name: 'collections', label: 'Collections', type: 'refs', to: 'collection', group: 'Collections & occasions', help: 'Tick as many as you like.' },
      { name: 'occasions', label: 'Gifting occasions', type: 'refs', to: 'occasion', group: 'Collections & occasions', help: 'Tick as many as you like.' },
      { name: 'seoDescription', label: 'Search description', type: 'text', rows: 2, max: 160, group: 'SEO', help: 'Optional. Defaults to the size, materials and your note.' },
    ],
  },
  collection: {
    label: 'Collection',
    plural: 'Collections',
    titleField: 'name',
    thumbField: 'cover',
    orderable: true,
    intro: 'Drag to change the order used across the site. Deleting a collection never removes its artworks.',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', source: 'name' },
      { name: 'intro', label: 'Short intro', type: 'text', rows: 3, help: 'One or two sentences in your own words.' },
      { name: 'cover', label: 'Cover image or video', type: 'media' },
      visible,
    ],
  },
  occasion: {
    label: 'Gifting occasion',
    plural: 'Gifting occasions',
    titleField: 'name',
    thumbField: 'cover',
    orderable: true,
    intro: 'Drag to change the order. Deleting an occasion never removes its artworks.',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', source: 'name' },
      { name: 'intro', label: 'Short intro', type: 'text', rows: 3 },
      { name: 'cover', label: 'Cover image or video', type: 'media' },
      visible,
      { name: 'seasonStart', label: 'Season starts', type: 'date', help: 'Optional. Shows a "This season" badge on the Gifting pages from 6 weeks before this date, e.g. Diwali.' },
      { name: 'seasonEnd', label: 'Season ends', type: 'date', help: 'Optional. The badge goes after this date. Update both dates each year.' },
    ],
  },
  exhibition: {
    label: 'Exhibition',
    plural: 'Exhibitions',
    titleField: 'name',
    thumbField: 'gallery',
    intro: 'Upcoming or past is worked out from the dates.',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', source: 'name' },
      { name: 'venue', label: 'Venue', type: 'string', required: true },
      { name: 'city', label: 'City', type: 'string', required: true },
      { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'endDate', label: 'End date', type: 'date', help: 'Shown as upcoming until this date has passed.' },
      { name: 'description', label: 'Description', type: 'text', rows: 4 },
      { name: 'gallery', label: 'Photo gallery', type: 'mediaList', help: 'Installation shots, work on display, opening night.' },
    ],
  },
  post: {
    label: 'Journal post',
    plural: 'Journal',
    titleField: 'title',
    thumbField: 'cover',
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      { name: 'slug', label: 'Web address', type: 'slug', source: 'title' },
      { name: 'publishedAt', label: 'Date', type: 'date', required: true },
      { name: 'excerpt', label: 'One-line summary', type: 'text', rows: 2, max: 200, required: true },
      { name: 'cover', label: 'Cover image or video', type: 'media' },
      { name: 'artworks', label: 'Artworks this story is about', type: 'refs', to: 'artwork' },
      { name: 'body', label: 'Story', type: 'blocks', help: 'Add paragraphs, headings, quotes and images. Drag to reorder.' },
    ],
  },
  testimonial: {
    label: 'Testimonial',
    plural: 'Testimonials',
    titleField: 'name',
    thumbField: 'photo',
    fields: [
      { name: 'name', label: 'Client name', type: 'string', required: true },
      { name: 'city', label: 'City', type: 'string' },
      { name: 'quote', label: 'Quote', type: 'text', rows: 4, max: 400, required: true },
      { name: 'photo', label: 'Photo of the art in their home', type: 'media' },
    ],
  },
  siteSettings: {
    label: 'Site settings',
    plural: 'Site settings',
    titleField: 'siteName',
    groups: ['Home page', 'Shop', 'Contact & social', 'Footer FAQs', 'SEO'],
    fields: [
      { name: 'tagline', label: 'Tagline', type: 'string', group: 'Home page', help: 'Small line above the big heading on the home page.' },
      { name: 'statement', label: 'Artist statement', type: 'text', rows: 2, group: 'Home page', help: 'Two lines. Press Enter once for the line break.' },
      { name: 'heroVideos', label: 'Hero videos', type: 'mediaList', max: 3, group: 'Home page', help: 'Up to 3 looping clips, shown full screen. The first plays straight away; the others fade in. Click a picture to set the point that must always stay in view.' },
      {
        name: 'teaser', label: 'New collection teaser', type: 'object', group: 'Home page',
        fields: [
          { name: 'enabled', label: 'Show teaser', type: 'boolean' },
          { name: 'title', label: 'Collection title', type: 'string' },
          { name: 'launchDate', label: 'Launch date', type: 'date' },
          { name: 'copy', label: 'Text', type: 'text', rows: 3 },
        ],
      },
      { name: 'ticker', label: 'Scrolling strip', type: 'stringList', itemLabel: 'Phrase', group: 'Home page', help: 'Short phrases that scroll across the home page under the teaser. Remove them all to hide the strip.' },
      { name: 'storyPost', label: '"Story behind the piece" on the home page', type: 'ref', to: 'post', group: 'Home page', help: 'Leave empty to show the newest journal post.' },
      { name: 'showPrices', label: 'Show prices', type: 'boolean', group: 'Shop', help: 'Off: no artwork prices anywhere on the site (people enquire instead). On: prices show on cards and artwork pages.' },
      { name: 'whatsappNumber', label: 'WhatsApp number', type: 'string', group: 'Contact & social', help: 'Country code + number, digits only, e.g. 919876543210' },
      { name: 'email', label: 'Email', type: 'string', group: 'Contact & social' },
      { name: 'instagram', label: 'Instagram link', type: 'url', group: 'Contact & social' },
      { name: 'etsy', label: 'Etsy shop link', type: 'url', group: 'Contact & social' },
      { name: 'footerFaqs', label: 'Care, framing, shipping and returns', type: 'objectList', itemLabel: 'Question', group: 'Footer FAQs', fields: [{ name: 'q', label: 'Question', type: 'string' }, { name: 'a', label: 'Answer', type: 'text', rows: 3 }] },
      { name: 'siteName', label: 'Site name', type: 'string', group: 'SEO' },
      { name: 'shortBio', label: 'Short bio (footer and search)', type: 'text', rows: 3, group: 'SEO' },
      { name: 'seoTitle', label: 'Default page title', type: 'string', group: 'SEO' },
      { name: 'seoDescription', label: 'Default search description', type: 'text', rows: 3, max: 160, group: 'SEO' },
      { name: 'ogImage', label: 'Default social share image', type: 'image', group: 'SEO', help: 'Ideally 1200 × 630.' },
    ],
  },
  aboutPage: {
    label: 'About page',
    plural: 'About page',
    titleField: 'heading',
    fields: [
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'intro', label: 'Intro', type: 'text', rows: 4 },
      { name: 'portrait', label: 'Portrait', type: 'media' },
      { name: 'process', label: 'Process steps', type: 'objectList', itemLabel: 'Step', fields: [{ name: 'title', label: 'Title', type: 'string' }, { name: 'text', label: 'Text', type: 'text', rows: 2 }] },
      { name: 'studioMedia', label: 'Studio footage', type: 'mediaList', help: 'Four clips in order: raw material, building the surface, laying the leaf, finished piece.' },
      { name: 'exampleMoment', label: 'Worked example: the moment', type: 'text', rows: 4 },
      { name: 'exampleArtwork', label: 'Worked example: the piece it became', type: 'ref', to: 'artwork' },
    ],
  },
  commissionsPage: {
    label: 'Commissions page',
    plural: 'Commissions page',
    titleField: 'heading',
    fields: [
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'intro', label: 'Intro', type: 'text', rows: 3 },
      { name: 'steps', label: 'How it works', type: 'objectList', itemLabel: 'Step', fields: [{ name: 'title', label: 'Title', type: 'string' }, { name: 'text', label: 'Text', type: 'text', rows: 2 }, { name: 'duration', label: 'When', type: 'string' }] },
      { name: 'whatToShare', label: 'What to share', type: 'stringList', itemLabel: 'Point' },
      { name: 'typicalTimeline', label: 'Typical timeline', type: 'text', rows: 2 },
      { name: 'priceGuide', label: 'Price guide', type: 'text', rows: 2 },
    ],
  },
};

export function slugSource(type: ContentType): string | undefined {
  const f = TYPES[type].fields.find((x) => x.type === 'slug');
  return f && f.type === 'slug' ? f.source : undefined;
}

/** Missing required fields, as human labels. Checked before publishing. */
export function missingRequired(type: ContentType, doc: Record<string, any>): string[] {
  return TYPES[type].fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = doc[f.name];
      if (f.type === 'mediaList' || f.type === 'refs') return !Array.isArray(v) || v.length === 0;
      if (f.type === 'number') return v === undefined || v === null || v === '' || Number.isNaN(Number(v));
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.label);
}

/** Fresh document with sensible defaults (select initial values, booleans) */
export function emptyDoc(type: ContentType): Record<string, any> {
  const doc: Record<string, any> = {};
  for (const f of TYPES[type].fields) {
    if (f.type === 'select' && f.initial) doc[f.name] = f.initial;
    if (f.name === 'visible') doc.visible = true;
  }
  if (type === 'artwork') doc.sizeUnit = 'in';
  return doc;
}
