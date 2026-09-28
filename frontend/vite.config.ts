/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite = the development server and build tool for the frontend.
 *
 * During development the browser talks ONLY to Vite on http://localhost:5173.
 * Any request whose path starts with /api is forwarded ("proxied") by Vite to the
 * Spring Boot backend on http://localhost:8080. Because the browser sees one single
 * origin, no CORS configuration is needed.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
  },
});
