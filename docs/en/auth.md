# Spec: Authentication and User Management (./auth.md)

**Status:** implemented (v1) · **Migration:** `0003_auth.sql` · **FSD layer:** `src/features/auth` + `src/shared/api/session-repo.ts`

---

## 1. Context and constraints

A clinical data registry — public registration is excluded. Accounts are created
only by the admin. Key stack constraints:

- Runtime — **Cloudflare Workers** (`@opennextjs/cloudflare`): no `node:crypto`
  for bcrypt/argon2, Web Crypto (`crypto.subtle`) is required;
- the only DB — **D1**, no separate identity provider;
- project principle — minimal external dependencies (no Auth.js/Lucia).

## 2. Options considered (decisions)

| Option                                          | Decision                                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own sessions on D1 + PBKDF2 (Web Crypto)        | **ACCEPTED** — zero dependencies, full control, fits the registry-driven style                                                                                                              |
| Cloudflare Access (Zero Trust, JWT from header) | rejected as the primary path: ties to a CF account, harder local development; candidate on escalation                                                                                       |
| Auth.js (next-auth) / Lucia                     | rejected: there are still no OAuth providers for registration, the dependency is not justified                                                                                              |
| Public registration                             | **forbidden** (PII, clinical registry)                                                                                                                                                      |
| Invites through the app (one-time token links)  | ~~deferred (v1.5), after the admin-UI appears~~ — **implemented** (stage 3, [spec-stage-3.md §6](./spec-stage-3.md)): admin-UI of issued invites, one-time `/invite/<token>` links (7 days) |
| Registration by a key code                      | rejected: a code is transferable, weaker than an invite                                                                                                                                     |

## 3. Data schema (migrations/0003_auth.sql, manual migration)

- `users`: `id` (UUID), `email` (UNIQUE, COLLATE NOCASE), `password_hash`,
  `display_name`, `role` CHECK IN (`admin` | `clinician` | `readonly`),
  `must_change_password` (0/1), `created_at`, `updated_at`.
- `sessions`: `id` = **SHA-256(token)** hex (the token itself only in the cookie),
  `user_id` FK ON DELETE CASCADE, `created_at`, `expires_at`, `user_agent`;
  indexes on `user_id` and `expires_at`.

## 4. Passwords (src/shared/lib/password.ts)

- **PBKDF2-SHA256** via `crypto.subtle`: 600 000 iterations (`PBKDF2_ITERATIONS`),
  salt 16 bytes, key length 256 bits. Works in Workers and Node >= 18,
  the same code at runtime and in `scripts/create-user.ts`.
- Hash format: `pbkdf2$<iterations>$<salt-hex>$<hash-hex>` — parameters are inside
  the string, raising iterations does not break old hashes.
- Verification — constant-time comparison (`verifyPassword`).
- Policy: at least 10 characters; password generation — 12 random bytes base64url.
- Alternatives bcrypt/argon2 are not available natively in Workers — noted.

## 5. Sessions (src/shared/api/session-repo.ts)

- **Token**: 32 cryptographically random bytes, base64url; lives ONLY in the cookie
  `rdd_session` (`HttpOnly; Secure; SameSite=Lax; path=/`). In the DB — SHA-256(token):
  a database leak does not hijack sessions.
- **TTL 12 hours** (shift changes at the clinic), sliding renewal: with < 6 hours left
  the session is extended to the full 12 h at validation — but not beyond the
  **absolute ceiling of 7 days since login** (`SESSION_ABSOLUTE_TTL_DAYS`
  in `session-repo.ts`): stealing an active user's token yields at most
  7 days of access, after which the session is forcibly invalidated at validation.
- Expired sessions are removed at validation; `purgeExpiredSessions` is called on
  login. `destroySession` is idempotent (logout).
- The cookie is set in `loginAction` (`src/features/auth/api/actions.ts`), maxAge = TTL.

## 6. Login/logout (src/features/auth)

- Server Actions `loginAction` / `logoutAction` ('use server').
- **Anti-enumeration**: the same 400 ms delay for a non-existent email and
  a wrong password — account existence is not revealed.
- `logoutAction` deletes the session from the DB and the cookie, redirects to `/login`.
- The form — `ui/login-form.tsx` on `useActionState` (React 19); page `app/login/page.tsx`.
- `getCurrentUser()` (null without redirect) and `requireUser()` (redirect `/login`) live in
  `src/shared/api/session-server.ts` — the session is infrastructure, not a feature (the
  server helpers in `features/auth` only re-export them) — server-only environment (next/headers).

## 7. Route protection (src/middleware.ts)

Two-level model:

1. **Middleware** — instant redirect only by cookie PRESENCE (no DB query):
   no cookie and not `/login`/`/invite/*` → `/login`; cookie present and `/login` → `/patients`.
   The middleware does not do full token validation.
2. **`requireUser()`** — full token validation against D1 in server pages/actions.

Protected pages — server wrappers: e.g.
`app/patients/[id]/matrix/page.tsx` calls `requireUser()` and renders the client
`matrix-client.tsx` + user menu (`UserMenu`: name, role, locale switcher,
"Log out" button via `<form action={logoutAction}>`). The demo route `/matrix` was removed
(stage 2, `./spec-stage-2.md` §1 decision 4): the matrix lives at `/patients/[id]/matrix`,
a non-numeric/missing `id` redirects to `/patients`.

## 8. Roles

- `admin` — user management (`/admin/users`, stage 3), access to everything;
- `clinician` — read and write of clinical data (default);
- `readonly` — read-only; `canWrite(user)` check (session-repo) is mandatory
  in every mutation Server Action (`src/features/matrix/api/actions.ts`, admin-UI).

## Row-level access: "whose card" binding (migrations/0005_data_scope.sql)

Authentication (role: who you are) and data-level authorization (scope: what you
see) are different things. The visibility width of patients is set by the column
`users.data_scope` (admin toggle in `/admin/users`):

- `all` (default) — sees all patients;
- `site` — only patients of own center (`patients.site_id = users.site_id`;
  without a center binding — nothing is visible, fail closed);
- `assigned` — only patients assigned to this physician
  (`patients.assigned_clinician_id = users.id`).

Mechanics: `createPatientRepository(db, patientScopeFor(user))` creates
a repository ALREADY scoped — `list/listPage/count/findById` are automatically
filtered, including `findById` (otherwise the card would open by a direct link
when the list is hidden — IDOR). When creating a patient, the Server Action sets
the creator's `site_id` and `assigned_clinician_id` (if the creator is not `all`).
The `/reports` aggregates also respect `data_scope` (the same `site_id`/`assigned_clinician_id`,
see `queries.ts`).

## 9. Creating users (scripts/create-user.ts)

There is no public registration. Two modes:

- `npm run user:create` — local DB via `getPlatformProxy`;
- `npm run user:create:remote` — prod via `wrangler d1 execute rdd --remote`
  (temporary SQL file, `prod` confirmation input, record verification after insert).

- Interactive mode: email → name → password (hidden input, muted readline) +
  repeat; role is asked from the 2nd user on.
- **The first user is always `admin`** (COUNT(*) users check).
- Non-interactive mode (CI): `--email --name --role --password` or
  `--gen-password` (password printed once).
- If the users table is missing — a hint to apply migrations, instead of a stack trace.
- D1 nuance: `first(arg)` treats the argument as a column name, not a binding —
  use `.bind(x).first()`.

## 10. Manual migrations and db:restart

Manual migrations (outside gen:d1) — `0002_audit.sql` … `0007_export_throttle.sql`
(audit, auth, rate-limit/invites, row-level access, hash-chain, export throttling).
The full list is hardcoded in `MANUAL_MIGRATIONS` in `scripts/db-restart.ts`: on reset
they are temporarily moved out of migrations/, gen:d1 generates the baseline as
`0001_init.sql`, the manual ones are restored and applied AFTER the baseline
(0002_audit contains indexes on the registry tables). The "move first, then delete"
order is critical.

## 11. Audit (integration with ./matrix.md §6.6)

`actor_id` in `audit_log` = `SessionUser.id`, taken from `requireUser()` /
`getCurrentUser()` at the mutation site and passed to `AuditEntry.actorId`.
The data write + audit are a single `db.batch`. ~~While matrix records are demo (mock),
substitution is done at the site of future real Server Actions.~~ —
**Real mutations are implemented** (stage 1, [spec-stage-1.md](./spec-stage-1.md),
[matrix.md §6.6](./matrix.md)): matrix Server Actions call
`phase-repo.updateWithVersion` with `actorId = user.id`, audit is written in the same `db.batch`.

## 12. Known limitations and escalation thresholds

- ~~**No rate-limit on login** (only the 400 ms delay); threshold — failure
  counter in `users` + temporary lockout, or Cloudflare WAF rate limiting.~~ —
  **Rate-limit is implemented** (stage 3, [spec-stage-3.md §3](./spec-stage-3.md)):
  5 wrong passwords → 15 min lockout (`failed_attempts`/`locked_until` in `users`,
  migration `0004_auth_v15.sql`); the constant 400 ms delay is kept. The escalation
  threshold on public access — Cloudflare WAF (outside code).
- **Export throttling** (outside login rate-limit): `exportDeidentified` — the most
  expensive Server Action — is limited to 1 export/60 s per user
  (`users.last_export_at`, migration `0007_export_throttle.sql`,
  `src/shared/api/export-throttle.ts`, [export.md §2](./export.md));
  `failed_attempts`/`locked_until` are deliberately NOT reused.
  The rest of the Server Action flood is an accepted demo risk
  ([threat-model.md §2 D](./threat-model.md)).
- ~~`must_change_password` is reserved in the schema, but the change-password-on-first-login
  and "forgot password" (reset via create-user / invite) scenarios — TODO v1.5.~~ —
  **Implemented** (stage 3, [spec-stage-3.md §4](./spec-stage-3.md)):
  `must_change_password=1` → forced redirect to `/change-password`;
  "forgot password" — admin resets via admin-UI (§5) or an invite with a new
  password assignment.
- Session key rotation is not required (tokens are one-time random, only a hash is stored).
- On escalation to external users — re-evaluate Cloudflare Access
  (see §2) as an SSO layer over the current session.

## 13. How to check manually

1. `npm run dev` (local D1 already with migrations) or `npm run dev:cf`.
2. Open `/patients` without a cookie → redirect to `/login`.
3. Log in: `admin@test.local` (local test, password from the `user:create` output).
4. `/patients` — menu with name/role, "Log out" → `/login`, cookie deleted.
