import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app works on GitHub Pages regardless of repo name.
  base: './',
  plugins: [react(), tailwindcss()],
})
