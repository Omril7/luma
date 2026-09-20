const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX = 10 * 1024 * 1024 // 10 MB — Cloudinary free-tier ceiling

interface UploadTicket {
  provider: string
  endpoint: string
  fields: Record<string, string>
}

function urlFromResponse(provider: string, body: Record<string, unknown>): string {
  switch (provider) {
    case 'cloudinary':
      return body.secure_url as string
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}

/**
 * Request a signed upload ticket and post the file straight to the storage
 * provider from the browser — the bytes never touch our server/Vercel function.
 * `ticketUrl` is the endpoint that issues the ticket (`/api/admin/upload` with a
 * bearer token, or the public `/api/reviews/upload`).
 */
export async function uploadImage(file: File, ticketUrl: string, token?: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('סוג קובץ לא נתמך')
  if (file.size > MAX) throw new Error('הקובץ גדול מדי (עד 10MB)')

  const res = await fetch(ticketUrl, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error('שגיאה בהעלאה')
  const ticket = (await res.json()) as UploadTicket

  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(ticket.fields)) fd.append(k, v)

  const up = await fetch(ticket.endpoint, { method: 'POST', body: fd })
  const body = await up.json().catch(() => ({}))
  if (!up.ok) throw new Error(body?.error?.message ?? 'שגיאה בהעלאה')
  return urlFromResponse(ticket.provider, body)
}
