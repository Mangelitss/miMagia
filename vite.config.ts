import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'miMagia',
        short_name: 'miMagia',
        description: 'Repertorio privado de rutinas de magia y escuela.',
        lang: 'es',
        theme_color: '#1d1712',
        background_color: '#f1e4c8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // Las rutas /__/ las sirve Firebase Hosting (inicio de sesión con Google): nunca desde la caché.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
})
