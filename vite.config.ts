import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { normalizePublicSiteUrl } from './src/lib/site-url.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = normalizePublicSiteUrl(env.VITE_SITE_URL)

  return {
    base: './',
    plugins: [
      react(),
      {
        name: 'veil-production-metadata',
        transformIndexHtml(html: string) {
          return html.replaceAll('__SITE_URL__', siteUrl)
        },
      },
    ],
    build: {
      target: 'es2022',
      cssMinify: 'lightningcss',
      sourcemap: false,
      assetsInlineLimit: 4096,
    },
  }
})
