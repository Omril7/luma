import 'server-only'

// ── Note ──────────────────────────────────────────────────────────────────────
// Instagram's legacy api.instagram.com/oembed endpoint no longer serves JSON (it now
// 302-redirects to a normal instagram.com HTML page). The working endpoint today is the
// Graph API family's instagram_oembed. As of writing it accepts unauthenticated requests —
// verified live against real posts — but the response contains no thumbnail_url/caption/author
// field at all (confirmed live against two different real posts), only
// { version, provider_name, provider_url, type, width, html }. `html` is Instagram's own embed
// widget markup, so this service's only job is: confirm the URL resolves to a real, public,
// embeddable post, and extract the canonical permalink Meta embeds in that markup (Meta
// normalizes e.g. /p/... to /reel/... for reels) — the actual rendering happens client-side via
// Instagram's embed.js against that permalink (see InstagramEmbedCarousel.tsx).

const OEMBED_ENDPOINT = 'https://graph.facebook.com/v20.0/instagram_oembed'

export type InstagramOEmbedErrorCode =
  | 'INVALID_URL'
  | 'MEDIA_NOT_FOUND'
  | 'ACCESS_TOKEN_REQUIRED'
  | 'UPSTREAM_ERROR'
  | 'FETCH_FAILED'

export class InstagramOEmbedError extends Error {
  code: InstagramOEmbedErrorCode
  constructor(code: InstagramOEmbedErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

interface GraphOEmbedErrorBody {
  error?: {
    message?: string
    code?: number
    error_user_title?: string
    error_user_msg?: string
  }
}

interface GraphOEmbedSuccessBody {
  html?: string
}

function classifyError(body: GraphOEmbedErrorBody): InstagramOEmbedError {
  const err = body.error
  const text = `${err?.message ?? ''} ${err?.error_user_msg ?? ''}`.toLowerCase()

  if (err?.code === 190 || text.includes('access token') || text.includes('oauth')) {
    return new InstagramOEmbedError(
      'ACCESS_TOKEN_REQUIRED',
      'Instagram oEmbed now requires an access token'
    )
  }
  if (err?.code === 24) {
    return new InstagramOEmbedError('MEDIA_NOT_FOUND', err.error_user_msg ?? 'Media not found')
  }
  if (err?.error_user_title === 'Invalid URL') {
    return new InstagramOEmbedError('INVALID_URL', err.error_user_msg ?? 'Invalid post URL')
  }
  return new InstagramOEmbedError(
    'UPSTREAM_ERROR',
    err?.message ?? 'Instagram oEmbed request failed'
  )
}

/** Extracts the canonical `data-instgrm-permalink` from Meta's returned embed HTML, dropping any
 *  tracking query string. Falls back to the admin's original input if extraction fails — a failed
 *  canonicalization isn't worth hard-failing the import over. */
function extractPermalink(html: string | undefined, fallback: string): string {
  const match = html?.match(/data-instgrm-permalink="([^"]+)"/)
  if (!match) return fallback
  return match[1].split('?')[0]
}

export async function resolveInstagramPermalink(postUrl: string): Promise<string> {
  const params = new URLSearchParams({ url: postUrl })
  const token = process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN
  if (token) params.set('access_token', token)

  let res: Response
  try {
    res = await fetch(`${OEMBED_ENDPOINT}?${params.toString()}`)
  } catch {
    throw new InstagramOEmbedError('FETCH_FAILED', 'Could not reach Instagram oEmbed')
  }

  const body = (await res.json().catch(() => ({}))) as GraphOEmbedErrorBody & GraphOEmbedSuccessBody

  if (!res.ok || body.error) {
    throw classifyError(body)
  }

  return extractPermalink(body.html, postUrl)
}
