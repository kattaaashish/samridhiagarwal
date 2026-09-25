import { defineField, defineType } from 'sanity';

export const artwork = defineType({
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  groups: [
    { name: 'main', title: 'Piece', default: true },
    { name: 'media', title: 'Photos & video' },
    { name: 'grouping', title: 'Collections & occasions' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', group: 'main', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL slug', type: 'slug', group: 'main', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({
      name: 'note',
      title: 'The moment behind the piece',
      type: 'text',
      rows: 4,
      group: 'main',
      description: 'The moment, thought or feeling that became this piece. Two or three sentences, in your voice. Shown right beside the images.',
      validation: (r) => r.required().max(600),
    }),
    defineField({ name: 'status', title: 'Status', type: 'string', group: 'main', initialValue: 'available',
      options: { list: [ { title: 'Available', value: 'available' }, { title: 'Sold', value: 'sold' }, { title: 'Made to order', value: 'made-to-order' } ], layout: 'radio' } }),
    defineField({ name: 'price', title: 'Price (INR)', type: 'number', group: 'main', validation: (r) => r.required().min(0) }),
    defineField({ name: 'width', title: 'Width (cm)', type: 'number', group: 'main', validation: (r) => r.required().positive() }),
    defineField({ name: 'height', title: 'Height (cm)', type: 'number', group: 'main', validation: (r) => r.required().positive() }),
    defineField({ name: 'depth', title: 'Depth (cm)', type: 'number', group: 'main' }),
    defineField({ name: 'materials', title: 'Materials', type: 'string', group: 'main', description: 'e.g. Acrylic and gold leaf on canvas' }),
    defineField({ name: 'featured', title: 'Feature on home page', type: 'boolean', group: 'main', initialValue: false }),
    defineField({ name: 'etsyUrl', title: 'Etsy listing URL', type: 'url', group: 'main', description: 'Optional. Shows a "Buy on Etsy" button for international buyers.' }),

    defineField({
      name: 'media',
      title: 'Photos & video',
      type: 'array',
      group: 'media',
      of: [{ type: 'media' }],
      description: 'First item is the main image. Add close-ups of texture and the piece on a wall. Drag to reorder.',
      validation: (r) => r.required().min(1),
    }),

    defineField({
      name: 'collections',
      title: 'Collections',
      type: 'array',
      group: 'grouping',
      of: [{ type: 'reference', to: [{ type: 'collection' }], weak: true }],
      description: 'A piece can be in several collections. Deleting a collection never affects the artwork.',
    }),
    defineField({
      name: 'occasions',
      title: 'Gifting occasions',
      type: 'array',
      group: 'grouping',
      of: [{ type: 'reference', to: [{ type: 'occasion' }], weak: true }],
    }),

    defineField({ name: 'seoDescription', title: 'Meta description', type: 'text', rows: 2, group: 'seo', validation: (r) => r.max(160), description: 'Optional. Defaults to size, materials and the note.' }),
  ],
  preview: {
    select: { title: 'title', media: 'media.0.image', status: 'status', price: 'price' },
    prepare: ({ title, media, status, price }) => ({ title, media, subtitle: `${status ?? 'available'} · ₹${price?.toLocaleString?.('en-IN') ?? ''}` }),
  },
});
