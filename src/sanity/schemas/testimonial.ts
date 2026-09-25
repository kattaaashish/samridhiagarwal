import { defineField, defineType } from 'sanity';

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Client name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'city', title: 'City', type: 'string' }),
    defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: (r) => r.required().max(400) }),
    defineField({ name: 'photo', title: 'Photo of the art in their home', type: 'media' }),
  ],
  preview: { select: { title: 'name', subtitle: 'city', media: 'photo.image' } },
});
