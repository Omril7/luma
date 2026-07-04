import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { FEATURES } from '@/lib/featureFlags'

const intlMiddleware = createMiddleware(routing)

// Storefront route prefixes (without locale) that are on hold while the shop is disabled.
const disabledShopPaths = ['/shop', '/product', '/cart', '/checkout', '/order-confirmation']

export default function middleware(request: NextRequest) {
  if (!FEATURES.shop) {
    const { pathname } = request.nextUrl
    const [, maybeLocale, ...rest] = pathname.split('/')
    const isLocalePrefixed = routing.locales.includes(
      maybeLocale as (typeof routing.locales)[number]
    )
    const locale = isLocalePrefixed ? maybeLocale : routing.defaultLocale
    const pathWithoutLocale = '/' + (isLocalePrefixed ? rest.join('/') : pathname.slice(1))

    if (
      disabledShopPaths.some(
        (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
      )
    ) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  // `admin` is excluded: the admin panel is not locale-prefixed and must not be
  // touched by next-intl's locale routing.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}
