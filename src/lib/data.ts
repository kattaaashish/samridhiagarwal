/**
 * Single entry point for content. Uses Sanity when PUBLIC_SANITY_PROJECT_ID is set,
 * otherwise falls back to seed/content.json so the site always builds fully populated.
 */
import { createClient } from '@sanity/client';
import { configureMedia } from './media';
import { normalize } from './normalize';
import type { Site } from './types';
import seed from '../../seed/content.json';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production';
const streamCustomerCode = import.meta.env.PUBLIC_STREAM_CUSTOMER_CODE as string | undefined;

configureMedia({ projectId, dataset, streamCustomerCode });

const TYPES = ['siteSettings', 'aboutPage', 'commissionsPage', 'collection', 'occasion', 'artwork', 'exhibition', 'post', 'testimonial'];

let cache: Promise<Site> | undefined;

async function load(): Promise<Site> {
  if (projectId) {
    const client = createClient({
      projectId,
      dataset,
      apiVersion: '2026-01-01',
      useCdn: false,
      token: import.meta.env.SANITY_READ_TOKEN || undefined,
      perspective: 'published',
    });
    // No `->` joins: references are resolved in normalize() so dangling ones are harmless.
    const docs = await client.fetch(`*[_type in $types]`, { types: TYPES });
    return normalize(docs);
  }
  return normalize(seed as any);
}

export function getSite(): Promise<Site> {
  cache ??= load();
  return cache;
}

export const usingSeed = !projectId;
