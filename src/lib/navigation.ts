const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const toSafeUrl = (candidate: string | undefined, currentHref: string) => {
  if (!candidate?.trim()) return null

  try {
    const url = new URL(candidate.trim(), currentHref)

    if (!ALLOWED_PROTOCOLS.has(url.protocol) || url.href === currentHref) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export const resolveReturnTarget = (
  configuredTarget: string | undefined,
  referrer: string,
  currentHref: string,
) =>
  toSafeUrl(configuredTarget, currentHref) ??
  toSafeUrl(referrer, currentHref)
