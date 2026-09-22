import { NextResponse, type NextRequest } from 'next/server'

/**
 * Мягкая защита на уровне middleware: проверяется только НАЛИЧИЕ cookie
 * сессии (полная валидация токена — в requireUser/getCurrentUser, где
 * доступен D1). Цель — мгновенный redirect без БД-запроса на каждый
 * статический запрос.
 */
const SESSION_COOKIE = 'rdd_session'

/** Публичные маршруты витрины (docs/ru/spec-public-1.md §1 п.1): точное совпадение. */
const PUBLIC_EXACT = new Set(['/', '/about', '/login'])

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl

  // Инвайт-ссылки доступны без сессии (регистрация нового пользователя)
  const isInvite = pathname.startsWith('/invite/')
  const isPublic = PUBLIC_EXACT.has(pathname) || isInvite

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/patients'
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()
  // Путь нужен requireUser() для сценария принудительной смены пароля
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: [
    // всё, кроме статики/иконок/файлов Next
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|ico|txt|xml|webmanifest)$).*)',
  ],
}
