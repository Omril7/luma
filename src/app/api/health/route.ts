import { LOCALE_DEFAULT, LOCALES } from '@/shared/constants'

export function GET() {
  return Response.json({
    status: 'ok',
    locales: LOCALES,
    defaultLocale: LOCALE_DEFAULT,
    timestamp: new Date().toISOString(),
  })
}
