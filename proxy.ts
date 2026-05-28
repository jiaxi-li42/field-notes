import { NextRequest, NextResponse } from 'next/server'

const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]

const defaultLocale: Locale = 'en'
const nonDefaultLocales = locales.filter((l) => l !== defaultLocale)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /en/... to its prefix-free canonical URL
  if (
    pathname === `/${defaultLocale}` ||
    pathname.startsWith(`/${defaultLocale}/`)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(`/${defaultLocale}`.length) || '/'
    return NextResponse.redirect(url)
  }

  // Non-default locale paths (/zh, /zh/...) reach app/[lang]/ directly
  const hasNonDefaultLocale = nonDefaultLocales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (hasNonDefaultLocale) return

  // Rewrite bare EN paths to /en/... for app/[lang]/ routing
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'  ],
}
