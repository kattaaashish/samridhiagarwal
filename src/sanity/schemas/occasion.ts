import { defineField, defineType } from 'sanity';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';

export const occasion = defineType({
  name: 'occasion',
  title: 'Gifting occasion',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: 'occasion' }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'intro', title: 'Short intro', type: 'text', rows: 3 }),
    defineField({ name: 'cover', title: 'Cover media', type: 'media' }),
    defineField({ name: 'visible', title: 'Visible on site', type: 'boolean', initialValue: true, description: 'Turn off to hide this occasion everywhere without deleting it. Artworks stay live.' }),
    defineField({ name: 'seasonStart', title: 'Season starts', type: 'date', description: 'Optional. The occasion is featured on the home page from 6 weeks before this date.' }),
    defineField({ name: 'seasonEnd', title: 'Season ends', type: 'date', description: 'Optional. Featuring stops after this date. Update both dates each year.' }),
  ],
  preview: {
    select: { title: 'name', media: 'cover.image', visible: 'visible', start: 'seasonStart' },
    prepare: ({ title, media, visible, start }) => ({ title, media, subtitle: [visible === false ? 'Hidden' : 'Visible', start ? `season from ${start}` : ''].filter(Boolean).join(' · ') }),
  },
});
