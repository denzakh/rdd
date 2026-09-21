# Spec public-2: private hub and curated docs (option A, PR2)

**Status:** spec · **Dependencies:** public-1 (public `/`, `/about`, `getCurrentUserSafe`, `landing/about` dictionaries)
**FSD layers:** `src/widgets/home-hub`, `src/shared/ui/top-navigation.tsx`, `src/shared/lib/intl/dictionaries`, `app/page.tsx`, `app/docs/page.tsx`, `app/layout.tsx`
**Goal:** a logged-in user on `/` sees a working hub instead of a redirect; a new private `/docs` holds 4–5 curated digest cards linking to GitHub — not a mirror of all md files. Portfolio goal closed, operations detail stays hidden.

---

## 1. Fixed decisions

| #   | Problem                                                                                                                            | Decision                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PR1 redirects a logged-in user from `/` to `/patients` — no cabinet entry point                                                    | `app/page.tsx`: when `getCurrentUserSafe()` returns a user, render `<HomeHub/>` instead of redirecting. `requireUser()` is forbidden here (guests would lose the landing)                                                                                  |
| 2   | A dashboard with live aggregation is expensive and duplicates `/reports`                                                           | Hub issues no new SQL: cards `Patients / Reports / Data Dictionary / Documentation` + search `GET /patients?q=` + `readonly` hint. No live counters                                                                                                        |
| 3   | A full `16+16 md + spec-stage-1..4` mirror is a separate feature layer (md runtime, TOC, highlighting, Workers cache, ru/en drift) | Private `/docs` (`requireUser()`) holds curated blocks only: architecture digest, security (threat→measure table), NFR/RTO/RPO digest, roadmap `spec-stage-1..4 ✅`, live `/data-dictionary` via internal link. Full texts link out to GitHub `docs/en+ru` |
| 4   | Guests must not see `/patients` in the menu                                                                                        | `TopNavigation` gains `Documentation → /docs` for logged-in users only (it already renders inside the private `<Header/>`). Public `site-header` keeps its own minimal nav                                                                                 |
| 5   | `<html lang="en">` is hardcoded in `app/layout.tsx`                                                                                | Make the layout an async server component, `lang={locale}` via `getLocale()`. Plus `metadata`: title `RDD — Depressive Disorders Registry`, README-based description, minimal OpenGraph without images                                                     |
| 6   | Hub/docs-hub copy must not be hardcoded in `tsx`                                                                                   | New `homeHub: {...}`, `docsHub: {...}` namespaces in `ru.ts` + `en.ts` (same pattern as `landing/about` from PR1)                                                                                                                                          |

## 2. PR2 routes

| Route    | Access                  | Content                                                     |
| -------- | ----------------------- | ----------------------------------------------------------- |
| `/`      | branching               | guest → `<Landing/>` (PR1), user → `<HomeHub user locale/>` |
| `/docs`  | private `requireUser()` | 5 cards (see §3) + GitHub links                             |
| `/about` | public                  | unchanged from PR1                                          |

## 3. `/docs` content

1. `Architecture (digest)` → GitHub `architecture-overview.md`;
2. `Security (threat → measure → where)` → `auth.md + threat-model.md`;
3. `NFR / RTO / RPO (digest)` → `nfr.md`;
4. `Roadmap: spec-stage-1..4 ✅` → `roadmap.md`;
5. `Live Data Dictionary` → internal `/data-dictionary` link (the one registry-driven runtime example, not retold).

## 4. home-hub widget

`src/widgets/home-hub/ui/home-hub.tsx` + `src/widgets/home-hub/index.ts`:

- greeting `displayName · role` (already available from `getCurrentUserSafe`, no new queries);
- 4 link-cards with one sentence each;
- search form `action="/patients" method="get" input name="q"`;
- for `role=readonly` — the `common.readOnly` dictionary line (mutations are already closed by `canWrite()` in Server Actions, no duplicated checks).

## 5. Acceptance criteria

1. 2×2 matrix (guest/user × ru/en): guest on `/` sees the landing, user sees the hub; `/docs` redirects guests to `/login` and admits users.
2. Hub search goes to `/patients?q=...` and shows the same list as a direct visit.
3. `must_change_password=1`: unchanged behavior — `requireUser()` inside `/docs` pushes to `/change-password` (no regression).
4. `/docs` embeds no full `deployment/auth/threat-model` texts; digests + outbound GitHub links only.
5. `npm run lint`, `npx tsc --noEmit`, `npm run steiger`, `npm run build` — green; FSD check passes on new `widgets/*`.
6. `public/robots.txt` from PR1 unchanged: `/docs` stays out of indexing.
