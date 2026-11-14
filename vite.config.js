import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web build is served from the site root (BrowserRouter needs absolute asset paths).
// The Capacitor Android build loads files from the app bundle, so it needs relative paths.
const isNativeBuild = process.env.CAPACITOR_BUILD === '1'

export default defineConfig({
  plugins: [react()],
  base: isNativeBuild ? './' : '/',
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
