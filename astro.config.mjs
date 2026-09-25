// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const projectId = env.PUBLIC_SANITY_PROJECT_ID || 'placeholder';
const dataset = env.PUBLIC_SANITY_DATASET || 'production';
const site = env.PUBLIC_SITE_URL || 'https://samridhiagarwal.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: { enabled: true },
  }),
  integrations: [
    react(),
    sanity({
      projectId,
      dataset,
      useCdn: false,
      apiVersion: '2026-01-01',
      studioBasePath: '/studio',
      stega: false,
    }),
    sitemap({
      filter: (page) => !page.includes('/studio') && !page.includes('/api/'),
      changefreq: 'weekly',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: { external: ['node:buffer', 'node:crypto'] },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { inlineStylesheets: 'auto', format: 'file' },
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SANITY_PROJECT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SANITY_DATASET: envField.string({ context: 'client', access: 'public', optional: true, default: 'production' }),
      PUBLIC_STREAM_CUSTOMER_CODE: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      SANITY_READ_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      NOTIFY_EMAIL: envField.string({ context: 'server', access: 'public', optional: true }),
      FROM_EMAIL: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
});
