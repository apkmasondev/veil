const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export const normalizePublicSiteUrl = (value: string | undefined) => {
  if (!value?.trim()) return ''

  const url = new URL(value.trim())

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_SITE_URL must use http or https.')
  }
  if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) {
    url.protocol = 'https:'
  }

  url.hash = ''
  url.search = ''
  return url.href.endsWith('/') ? url.href : `${url.href}/`
}
