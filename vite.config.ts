import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeSiteUrl = (value: string | undefined) => {
  if (!value?.trim()) return ''

  const url = new URL(value.trim())

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_SITE_URL must use http or https.')
  }

  url.hash = ''
  url.search = ''
  return url.href.endsWith('/') ? url.href : `${url.href}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL)

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
