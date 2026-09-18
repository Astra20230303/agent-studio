import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
const { frontendLicensePlugin } = createRequire(import.meta.url)('./scripts/frontend-licenses.cjs');

export default defineConfig({
  plugins: [react(), frontendLicensePlugin()],
  // Electron loads the production page through file://, so assets must be
  // relative to dist/index.html rather than rooted at /assets.
  base: './',
  server: { host: '127.0.0.1', port: Number(process.env.VITE_PORT || 5317), strictPort: true }
});
