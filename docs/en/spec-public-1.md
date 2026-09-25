# Spec public-1: public shell — landing and about (option A, PR1)

**Status:** spec · **Dependencies:** none (no DB, registry, or auth-logic changes)
**FSD layers:** `src/middleware.ts`, `src/widgets/landing`, `src/widgets/site-header`, `src/shared/lib/intl/dictionaries`, `app/page.tsx`, `app/about/page.tsx`
**Goal:** open the prod domain `rdd.ux42.studio` to guests: `/` and `/about` render with no session and no DB, presenting both project goals (clinical registry + Senior/Architect portfolio + PhD background). Private routes stay unchanged.

---

## 1. Fixed decisions

| #   | Problem                                                                                                                                     | Decision                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `middleware.ts` redirects everyone without `rdd_session` to `/login` — no public showcase                                                   | Public routes: `PUBLIC_EXACT = {'/', '/about', '/login'}` + `/invite/` prefix. Everything else (logged-in redirect from `/login` to `/patients`, `x-pathname`) unchanged                                     |
| 2   | `getDb()` throws in plain `next dev` (no CF context) — a public page must not 500                                                           | New `getCurrentUserSafe(): Promise<SessionUser\|null>` in `src/shared/api/session-server.ts`: `try/catch` around `getDb()` → `null`. `app/page.tsx` uses only it + `getLocale()`, no `getDb()/requireUser()` |
| 3   | Full `deployment.md` (675 lines), `auth.md` §4–6, `threat-model.md` must not leak (`database_id`, PBKDF2 params, rate-limit, reset scripts) | Public surface carries only a one-line `security summary` + GitHub link. Operations detail stays in `docs/` and GitHub, never ships in runtime HTML                                                          |
| 4   | No spec duplication inside runtime                                                                                                          | Full texts live only on GitHub `docs/en+ru`. Runtime holds a curated digest of `architecture-overview.md` (already written as a 3–5 minute digest) + links                                                   |
| 5   | Dumping markup into `app/` breaks FSD                                                                                                       | Markup goes to `src/widgets/landing`, `src/widgets/site-header` with `index.ts` barrels. `app/` keeps thin routes only. Verified by `npm run steiger`                                                        |
| 6   | The C4 diagram lives in `docs/diagrams/` — Next does not serve it                                                                           | Copy `docs/diagrams/c4-overview.svg` → `public/diagrams/c4-overview.svg` (RU) and `public/diagrams/c4-overview.en.svg` (EN); the landing renders `src={landing.diagramSrc}` via `<Image unoptimized>`        |
| 7   | `robots.txt` is currently `Disallow: /` — the landing is not indexed                                                                        | Open only the showcase (see §5); `/patients`, `/reports`, `/data-dictionary` stay closed                                                                                                                     |

## 2. PR1 routes

- `/` (public): `getLocale()` + `getCurrentUserSafe()`. Guest → `<Landing/>`. Logged-in user → redirect to `/patients` for now (the hub is public-2, keeping PR1 independently mergeable).
- `/about` (public, no DB): condensed `architecture-overview` — registry-core, CAS, matrix virtualization, one-line security summary, demo boundaries, `rdd-late-life-thesis` abstract link.
- Everything else unchanged.

## 3. Widgets

- `src/widgets/site-header/ui/site-header.tsx` — `public` mode: logo (`/favicon.svg`), `About → /about`, `<LocaleSwitcher/>`, `Sign in → /login`. Existing `<Header/>` untouched.
- `src/widgets/landing/ui/landing.tsx` — sections:
  1. hero: title + subtitle from `README.md:1-5` + badge from `landing.badge` (EN: `PhD, Bekhterev Institute, 2015`, RU: `к.м.н. по психиатрии, Институт Бехтерева, 2015`);
  2. CTAs: `Sign in` / `Docs on GitHub (architecture-overview.md)` / `Thesis abstract` (`landing.thesisUrl`: EN → `en/abstract/abstract.en.md`, RU → `ru/abstract/abstract.ru.md`);
  3. 4 cards: patient passport, phase matrix `1..N + 98/99`, reports/export `csv/json/xlsx`, registry-driven dictionary (one line each from `rdd-v1.md` §1);
  4. `Registry → D1/Zod/UI` block (3 lines from `architecture-overview` §1);
  5. demo boundaries: regulation, backup/DR, retention, medical validation, collab-sync — framed as "deliberately out of scope";
  6. footer `Demo: synthetic data only, no real PII`.
- Slice layout (FSD segments; the slice is still `src/widgets/landing`): `ui/landing.tsx` is only the `<main>` composition; `ui/landing-{hero,audience,capabilities,highlights,boundaries,footer}.tsx` hold one section each; `ui/icons/icon-{cross,machine}.tsx` hold the inline SVG glyphs (≈4 KB path); `model/landing-content.ts` builds the view model from the dictionary (`buildCards` / `buildHighlights` / `buildGoals`) and exports `LandingDict`. The slice public API is unchanged: `export { Landing } from './ui/landing'`. Removed as dead (nothing rendered them): the dictionary keys `landing.diagramTitle` / `diagramAlt` / `diagramSrc` and the copies `public/diagrams/c4-overview{,.en}.svg` — the C4 block is gone from the showcase, while the diagram sources stay in `docs/diagrams/` (read by `README.md`, `architecture-overview.md`, `threat-model.md`).
- Plus `src/widgets/landing/index.ts`, `src/widgets/site-header/index.ts`.

## 4. i18n dictionaries

Add `landing: {...}`, `about: {...}` namespaces to `src/shared/lib/intl/dictionaries/ru.ts` + `en.ts` (keys picked up by `DictShape` automatically from `ru`). Default `ru` per `resolveLocale()`. No separate files — the project keeps flat namespaces in these two files.

## 5. robots.txt

```txt
User-agent: *
Allow: /$
Allow: /about$
Disallow: /
```

## 6. Acceptance criteria

1. Guest opens `/` and `/about` with no redirect to `/login`; `/patients` still redirects guests.
2. Plain `next dev` with no CF context: `/` does not 500 (covers `getCurrentUserSafe`).
3. `npm run dev:cf` smoke: public pages issue no D1 queries.
4. RU/EN switch via `<LocaleSwitcher/>` works on `/` and `/about`.
5. `npm run lint`, `npx tsc --noEmit`, `npm run steiger`, `npm run build` — green; `/` and `/about` build as static, no `getDb`.
6. Public HTML contains no `database_id`, `pbkdf2`, `600k`, `400ms`, `db:restart:remote` strings.
