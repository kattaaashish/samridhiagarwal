import { defineField, defineType } from 'sanity';

/** A poster image plus optional Cloudflare Stream video. Used for every visual slot. */
export const media = defineType({
  name: 'media',
  title: 'Media (image or looping video)',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image / poster frame',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required().error('Every media slot needs a still image (it is the poster for the video).'),
    }),
    defineField({
      name: 'streamId',
      title: 'Cloudflare Stream video ID (optional)',
      type: 'string',
      description: 'Paste the video UID from Cloudflare Stream (Dashboard → Stream → the video → "Video ID"). 3–4 second silent loop. Leave blank for a still image.',
      validation: (r) => r.regex(/^[a-f0-9]{32}$/i, { name: 'Stream UID', invert: false }).warning('Stream IDs are 32 hex characters.'),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describe what is in the picture for people using screen readers and for search engines.',
      validation: (r) => r.required().max(200),
    }),
  ],
  preview: {
    select: { media: 'image', title: 'alt', streamId: 'streamId' },
    prepare: ({ media, title, streamId }) => ({ media, title: title || 'Media', subtitle: streamId ? 'Video + poster' : 'Image' }),
  },
});
