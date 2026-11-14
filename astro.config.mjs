// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://bikebuschico.org',
  integrations: [sitemap({
    filter: (page) => process.env.SHOP_LAUNCH === '1' || !/^\/shop(?:\/|$)/.test(new URL(page).pathname),
  })],
  build: {
    inlineStylesheets: 'auto',
  },
});
