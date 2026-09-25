import { defineField, defineType } from 'sanity';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';

export const collection = defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: 'collection' }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'intro', title: 'Short intro', type: 'text', rows: 3, description: 'One or two sentences in your voice.' }),
    defineField({ name: 'cover', title: 'Cover media', type: 'media' }),
    defineField({ name: 'visible', title: 'Visible on site', type: 'boolean', initialValue: true, description: 'Turn off to hide this collection everywhere without deleting it. Artworks stay live.' }),
  ],
  preview: {
    select: { title: 'name', media: 'cover.image', visible: 'visible' },
    prepare: ({ title, media, visible }) => ({ title, media, subtitle: visible === false ? 'Hidden' : 'Visible' }),
  },
});
