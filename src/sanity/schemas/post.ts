import { defineField, defineType } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Journal post',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'URL slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'publishedAt', title: 'Date', type: 'date', validation: (r) => r.required() }),
    defineField({ name: 'excerpt', title: 'One-line summary', type: 'text', rows: 2, validation: (r) => r.required().max(200) }),
    defineField({ name: 'cover', title: 'Cover media', type: 'media' }),
    defineField({
      name: 'artworks',
      title: 'The piece(s) this story is about',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'artwork' }], weak: true }],
    }),
    defineField({
      name: 'body',
      title: 'Story',
      type: 'array',
      of: [
        { type: 'block', styles: [ { title: 'Normal', value: 'normal' }, { title: 'Heading', value: 'h2' }, { title: 'Quote', value: 'blockquote' } ], marks: { decorators: [ { title: 'Bold', value: 'strong' }, { title: 'Italic', value: 'em' } ], annotations: [ { name: 'link', type: 'object', title: 'Link', fields: [ { name: 'href', type: 'url', title: 'URL', validation: (r: any) => r.uri({ allowRelative: true }) } ] } ] } },
        { type: 'image', options: { hotspot: true }, fields: [ { name: 'alt', type: 'string', title: 'Alt text' }, { name: 'caption', type: 'string', title: 'Caption' } ] },
      ],
    }),
  ],
  orderings: [{ title: 'Newest first', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'publishedAt', media: 'cover.image' } },
});
