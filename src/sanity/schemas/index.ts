import { media } from './media';
import { collection } from './collection';
import { occasion } from './occasion';
import { artwork } from './artwork';
import { exhibition } from './exhibition';
import { post } from './post';
import { testimonial } from './testimonial';
import { aboutPage, commissionsPage, siteSettings } from './singletons';

export const schemaTypes = [media, artwork, collection, occasion, exhibition, post, testimonial, siteSettings, aboutPage, commissionsPage];
export const singletonTypes = new Set(['siteSettings', 'aboutPage', 'commissionsPage']);
