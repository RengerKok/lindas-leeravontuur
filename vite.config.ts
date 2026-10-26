import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  resolve: { alias: [{ find: /^exceljs$/, replacement: fileURLToPath(new URL('./node_modules/.cache/linda/exceljs.cjs', import.meta.url)) }] },
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.png', 'voorbeeld-flashcards.xlsx'],
    manifest: {
      name: "Linda's Leeravontuur", short_name: 'Leeravontuur', lang: 'nl',
      description: 'Jouw persoonlijke leerplek, ook offline.',
      theme_color: '#356859', background_color: '#f7f8f6', display: 'standalone',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: { maximumFileSizeToCacheInBytes: 7000000, globPatterns: ['**/*.{js,mjs,css,html,png,woff2,xlsx}'], navigateFallbackDenylist: [/^\/auth\//] }
  })],
  test: { environment: 'jsdom', pool: 'threads', maxWorkers: 1, setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true }
});