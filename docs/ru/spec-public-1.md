# Спека public-1: публичный каркас — лендинг и about (вариант A, PR1)

**Статус:** спека · **Зависимости:** нет (не трогает БД, реестр, auth-логику)
**Слои FSD:** `src/middleware.ts`, `src/widgets/landing`, `src/widgets/site-header`, `src/shared/lib/intl/dictionaries`, `app/page.tsx`, `app/about/page.tsx`
**Цель:** открыть прод-домен `rdd.ux42.studio` для гостя: `/` и `/about` рендерятся без сессии и без БД, показывают обе цели проекта (клинический регистр + Senior/Architect-портфолио + PhD-бэкграунд). Приватные роуты не меняются.

---

## 1. Зафиксированные решения

| #   | Проблема                                                                                                                                                  | Решение                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `middleware.ts` редиректит всех без `rdd_session` на `/login` — публичной витрины нет                                                                     | Публичные маршруты: `PUBLIC_EXACT = {'/', '/about', '/login'}` + префикс `/invite/`. Остальная логика (редирект залогиненного с `/login` на `/patients`, `x-pathname`) без изменений                                        |
| 2   | `getDb()` бросает в обычном `next dev` (нет CF-контекста) — публичная страница не должна падать с 500                                                     | Новый `getCurrentUserSafe(): Promise<SessionUser\|null>` в `src/shared/api/session-server.ts`: `try/catch` вокруг `getDb()` → `null`. `app/page.tsx` использует только его + `getLocale()`, никаких `getDb()/requireUser()` |
| 3   | Полные `deployment.md` (675 строк), `auth.md §4-6`, `threat-model.md` нельзя светить наружу (`database_id`, PBKDF2-параметры, rate-limit, скрипты сброса) | Публично только `security summary` одной строкой + ссылка на GitHub. Операционка остаётся в `docs/` и GitHub, в рантайм не едет                                                                                             |
| 4   | Не дублировать спеки внутри рантайма                                                                                                                      | Полные тексты живут только в GitHub `docs/en+ru`. Внутри — курированная выжимка из `architecture-overview.md` (уже написан как digest 3–5 минут) + ссылки                                                                   |
| 5   | Разметка простынёй в `app/` нарушит FSD                                                                                                                   | Разметка в `src/widgets/landing`, `src/widgets/site-header` с баррелями `index.ts`. В `app/` только тонкие роуты. Проверка `npm run steiger`                                                                                |
| 6   | C4-диаграмма лежит в `docs/diagrams/` — Next её не отдаёт                                                                                                 | Копия `docs/diagrams/c4-overview.svg` → `public/diagrams/c4-overview.svg` (RU) и `public/diagrams/c4-overview.en.svg` (EN), в лендинге `<Image unoptimized>` с `src={landing.diagramSrc}`                                   |
| 7   | `robots.txt` сейчас `Disallow: /` — лендинг не индексируется                                                                                              | Открыть только витрину (см. §5), `/patients`, `/reports`, `/data-dictionary` остаются закрыты                                                                                                                               |

## 2. Роуты PR1

- `/` (public): `getLocale()` + `getCurrentUserSafe()`. Гость → `<Landing/>`. Залогиненный → пока редирект на `/patients` (хаб — это public-2, чтобы PR1 был независимо мержим).
- `/about` (public, без БД): сжатый `architecture-overview` — registry-core, CAS, virtualization матрицы, security-summary строкой, границы демо, ссылка на реферат `rdd-late-life-thesis`.
- Всё остальное — без изменений.

## 3. Виджеты

- `src/widgets/site-header/ui/site-header.tsx` — режим `public`: лого (`/favicon.svg`), `О проекте → /about`, `<LocaleSwitcher/>`, `Войти → /login`. Существующий `<Header/>` не трогаем.
- `src/widgets/landing/ui/landing.tsx` — секции:
  1. hero: заголовок + подзаголовок из `README.md:1-5` + бейдж из `landing.badge` (RU: `к.м.н. по психиатрии, Институт Бехтерева, 2015`, EN: `PhD, Bekhterev Institute, 2015`);
  2. CTA: `Войти` / `Документация на GitHub (architecture-overview.md)` / `Реферат диссертации` (`landing.thesisUrl`: RU → `ru/abstract/abstract.ru.md`, EN → `en/abstract/abstract.en.md`);
  3. 4 карточки: паспорт, матрица `1..N + 98/99`, отчёты/экспорт `csv/json/xlsx`, словарь из реестра (по строке из `rdd-v1.md §1`);
  4. блок `Registry → D1/Zod/UI` (3 строки из `architecture-overview §1`);
  5. границы демо: регуляторика, backup/DR, retention, медвалидация, коллаб-sync — формулировка «сознательно вне scope»;
  6. футер `Demo: synthetic data only, no real PII`.
- Структура слайса (FSD-сегменты; слайс остаётся `src/widgets/landing`): `ui/landing.tsx` — только композиция `<main>` из секций; `ui/landing-{hero,audience,capabilities,highlights,boundaries,footer}.tsx` — по одной секции на файл; `ui/icons/icon-{cross,machine}.tsx` — инлайновые SVG-глифы (path ≈ 4 КБ); `model/landing-content.ts` — сборка view-модели из словаря (`buildCards` / `buildHighlights` / `buildGoals`) и тип `LandingDict`. Публичный API слайса не изменился: `export { Landing } from './ui/landing'`.
- Плюс `src/widgets/landing/index.ts`, `src/widgets/site-header/index.ts`.

## 4. Словари i18n

Добавить в `src/shared/lib/intl/dictionaries/ru.ts` + `en.ts` неймспейсы `landing: {...}`, `about: {...}` (ключи подхватываются `DictShape` автоматически из `ru`). Дефолт `ru` как в `resolveLocale()`. Отдельных файлов не заводим — проект держит плоские неймспейсы в двух файлах.

## 5. robots.txt

```txt
User-agent: *
Allow: /$
Allow: /about$
Disallow: /
```

## 6. Критерии приёмки

1. Гость открывает `/` и `/about` без редиректа на `/login`; `/patients` по-прежнему редиректит гостя.
2. `next dev` без CF-контекста: `/` не падает с 500 (проверка `getCurrentUserSafe`).
3. `npm run dev:cf`: публичные страницы не делают запросов к D1.
4. RU/EN-переключение через `<LocaleSwitcher/>` работает на `/` и `/about`.
5. `npm run lint`, `npx tsc --noEmit`, `npm run steiger`, `npm run build` — зелёные; `/` и `/about` собираются как статика без `getDb`.
6. В публичном HTML нет строк `database_id`, `pbkdf2`, `600k`, `400 мс`, `db:restart:remote`.
