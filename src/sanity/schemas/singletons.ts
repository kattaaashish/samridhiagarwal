import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'home', title: 'Home page', default: true },
    { name: 'contact', title: 'Contact & social' },
    { name: 'footer', title: 'Footer FAQs' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'siteName', title: 'Site name', type: 'string', group: 'seo', initialValue: 'Samridhi Agarwal' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', group: 'home' }),
    defineField({ name: 'statement', title: 'Artist statement (two lines)', type: 'text', rows: 2, group: 'home', description: 'Press Enter once for the line break.' }),
    defineField({ name: 'shortBio', title: 'Short bio (footer, SEO)', type: 'text', rows: 3, group: 'seo' }),
    defineField({ name: 'heroVideos', title: 'Hero videos', type: 'array', of: [{ type: 'media' }], group: 'home', description: 'Up to 3 looping studio clips. The first plays immediately; the others crossfade in.', validation: (r) => r.max(3) }),
    defineField({
      name: 'teaser', title: 'New collection teaser', type: 'object', group: 'home',
      fields: [
        defineField({ name: 'enabled', title: 'Show teaser', type: 'boolean', initialValue: true }),
        defineField({ name: 'title', title: 'Collection title', type: 'string' }),
        defineField({ name: 'launchDate', title: 'Launch date', type: 'date' }),
        defineField({ name: 'copy', title: 'Copy', type: 'text', rows: 3 }),
      ],
    }),
    defineField({ name: 'storyPost', title: '"Story behind the piece" post on home', type: 'reference', to: [{ type: 'post' }], weak: true, group: 'home', description: 'Defaults to the newest post.' }),
    defineField({ name: 'whatsappNumber', title: 'WhatsApp number', type: 'string', group: 'contact', description: 'Country code + number, digits only, e.g. 919876543210' }),
    defineField({ name: 'email', title: 'Email', type: 'string', group: 'contact' }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url', group: 'contact' }),
    defineField({ name: 'etsy', title: 'Etsy shop URL', type: 'url', group: 'contact' }),
    defineField({ name: 'footerFaqs', title: 'Care, framing, shipping and returns FAQs', type: 'array', group: 'footer',
      of: [{ type: 'object', fields: [ defineField({ name: 'q', title: 'Question', type: 'string' }), defineField({ name: 'a', title: 'Answer', type: 'text', rows: 3 }) ], preview: { select: { title: 'q' } } }] }),
    defineField({ name: 'seoTitle', title: 'Default page title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'Default meta description', type: 'text', rows: 3, group: 'seo', validation: (r) => r.max(160) }),
    defineField({ name: 'ogImage', title: 'Default social share image (1200×630)', type: 'image', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'intro', title: 'Intro', type: 'text', rows: 4 }),
    defineField({ name: 'portrait', title: 'Portrait media', type: 'media' }),
    defineField({ name: 'process', title: 'Process steps (4)', type: 'array', of: [{ type: 'object', fields: [ defineField({ name: 'title', type: 'string', title: 'Title' }), defineField({ name: 'text', type: 'text', rows: 2, title: 'Text' }) ], preview: { select: { title: 'title' } } }] }),
    defineField({ name: 'studioMedia', title: 'Studio footage (raw material → finished piece)', type: 'array', of: [{ type: 'media' }], description: 'Four clips in order: raw material, building the surface, laying the leaf, finished piece.' }),
    defineField({ name: 'exampleMoment', title: 'Worked example: the moment', type: 'text', rows: 4 }),
    defineField({ name: 'exampleArtwork', title: 'Worked example: the piece it became', type: 'reference', to: [{ type: 'artwork' }], weak: true }),
  ],
  preview: { prepare: () => ({ title: 'About page' }) },
});

export const commissionsPage = defineType({
  name: 'commissionsPage',
  title: 'Commissions page',
  type: 'document',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'intro', title: 'Intro', type: 'text', rows: 3 }),
    defineField({ name: 'steps', title: 'How it works', type: 'array', of: [{ type: 'object', fields: [ defineField({ name: 'title', type: 'string', title: 'Title' }), defineField({ name: 'text', type: 'text', rows: 2, title: 'Text' }), defineField({ name: 'duration', type: 'string', title: 'When' }) ], preview: { select: { title: 'title', subtitle: 'duration' } } }] }),
    defineField({ name: 'whatToShare', title: 'What to share (bullet list)', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'typicalTimeline', title: 'Typical timeline', type: 'text', rows: 2 }),
    defineField({ name: 'priceGuide', title: 'Price guide', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Commissions page' }) },
});
