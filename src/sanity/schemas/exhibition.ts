import { defineField, defineType } from 'sanity';

export const exhibition = defineType({
  name: 'exhibition',
  title: 'Exhibition',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'venue', title: 'Venue', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'city', title: 'City', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'startDate', title: 'Start date', type: 'date', validation: (r) => r.required() }),
    defineField({ name: 'endDate', title: 'End date', type: 'date', description: 'Upcoming vs past is worked out automatically from this date.' }),
    defineField({ name: 'description', title: 'Short description', type: 'text', rows: 4 }),
    defineField({ name: 'gallery', title: 'Photo gallery', type: 'array', of: [{ type: 'media' }], description: 'Installation shots, work on display, opening night.' }),
  ],
  orderings: [{ title: 'Newest first', name: 'startDesc', by: [{ field: 'startDate', direction: 'desc' }] }],
  preview: { select: { title: 'name', subtitle: 'venue', media: 'gallery.0.image' } },
});
