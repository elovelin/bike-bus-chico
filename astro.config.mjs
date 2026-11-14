// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { site } from './src/data/site.ts';

const shopEnv = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'SHOP_');
const shopIsPublic = site.shopPublished && shopEnv.SHOP_STAGED !== '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://bikebuschico.org',
  integrations: [sitemap({
    filter: (page) => shopIsPublic || !/^\/shop(?:\/|$)/.test(new URL(page).pathname),
  })],
  build: {
    inlineStylesheets: 'auto',
  },
});
