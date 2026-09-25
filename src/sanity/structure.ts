import type { StructureResolver } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('artwork').title('Artworks'),
      orderableDocumentListDeskItem({ type: 'collection', title: 'Collections (drag to reorder)', S, context }),
      orderableDocumentListDeskItem({ type: 'occasion', title: 'Gifting occasions (drag to reorder)', S, context }),
      S.documentTypeListItem('exhibition').title('Exhibitions'),
      S.documentTypeListItem('post').title('Journal'),
      S.documentTypeListItem('testimonial').title('Testimonials'),
      S.divider(),
      S.listItem().title('Site settings').id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.listItem().title('About page').id('aboutPage').child(S.document().schemaType('aboutPage').documentId('aboutPage')),
      S.listItem().title('Commissions page').id('commissionsPage').child(S.document().schemaType('commissionsPage').documentId('commissionsPage')),
    ]);
