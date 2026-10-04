// @ts-check
import { defineConfig } from 'astro/config';

// Release (main) builds for zumodeia.com; the dev branch builds with
// SITE=https://f-n-ll.github.io (set by .github/workflows/deploy.yml).

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE || 'https://zumodeia.com',
});
