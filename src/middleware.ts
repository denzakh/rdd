import { NextResponse, type NextRequest } from 'next/server'

/**
 * Мягкая защита на уровне middleware: проверяется только НАЛИЧИЕ cookie
 * сессии (полная валидация токена — в requireUser/getCurrentUser, где
 * доступен D1). Цель — мгновенный redirect без БД-запроса на каждый
 * статический запрос.
 */
const SESSION_COOKIE = 'rdd_session'

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl

  if (!hasSession && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/patients'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // всё, кроме статики/иконок/файлов Next
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|ico|txt|xml|webmanifest)$).*)',
  ],
}
