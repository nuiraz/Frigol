import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Publié sur GitHub Pages dans le dossier « hub » du dépôt Frigol.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/Frigol/hub/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
