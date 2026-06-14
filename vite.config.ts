import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: process.env.NODE_ENV === 'development', // Disable in dev
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'badge.png'], // Only include tiny essential PWA assets (removed vorschau.jpg)
      manifest: {
        name: 'Bisou',
        short_name: 'Bisou',
        description: 'Deine tägliche Verbindung zum Partner',
        theme_color: '#F8F7FF',
        background_color: '#F8F7FF',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        lang: 'de',
        scope: '/',
        start_url: '/?mode=standalone',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        importScripts: ['/sw-push.js'],
        // Data-saving precache: only cache essential code and local UI icons
        globPatterns: ['**/*.{js,css,html}', 'favicon.png', 'badge.png'],
        // Explicitly ignore social media preview files and source maps to save data
        globIgnores: ['**/vorschau_og.jpg', '**/*.map'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache avatars & partner pictures from Supabase dynamically at runtime,
            // serving them instantly and updating them in the background.
            urlPattern: /^https:\/\/.*\.supabase\.(co|net)\/storage\/v1\/object\/public\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Code Splitting: Split third-party libraries into separate vendor files.
        // When you deploy an app change, only your app code chunk changes; the library chunks
        // remain cached in the user's browser, saving massive amounts of traffic!
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
