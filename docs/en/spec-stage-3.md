# Stage 3 spec: Auth v1.5 (./spec-stage-3.md)

**Status:** spec · **Dependencies:** stage 2 (admin-UI relies on the pages)
**FSD layers:** `src/features/auth`, `src/features/users`, `src/shared/api/session-repo.ts`, `scripts/`
**Goal:** close the TODO from ./auth.md §12 — password change, rate-limit, admin-UI, invites.

---

## 1. Fixed decisions

| #   | Problem         | Solution                                                                                              |
| --- | --------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Rate-limit      | Own: failure counters in `users` + temporary lockout (no KV — minimal dependencies)                   |
| 2   | Password change | Server Action; `must_change_password=1` → forced redirect to `/change-password`                       |
| 3   | Users admin-UI  | `/admin/users` page (role=admin only), Server Actions for create/lock/reset                           |
| 4   | Invites         | One-time token link (v1.5 from auth.md §2): the `invites` table, the link is issued from the admin-UI |
| 5   | Registration    | Still forbidden; the only path — an invite or the `user:create` script                                |

## 2. Migration `0004_auth_v15.sql` (manual, add to `MANUAL_MIGRATIONS` in `scripts/db-restart.ts`)

```sql
ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;            -- ISO, NULL = not locked
CREATE TABLE invites (
  id TEXT PRIMARY KEY,             -- uuid
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256(token from the link), like in sessions
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','clinician','readonly')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL,        -- 7 days
  used_at TEXT                     -- NULL = unused
);
```

## 3. Login rate-limit (auth.md §12, the threshold has been reached)

- `loginAction`: on failure — `failed_attempts += 1`; at `>= 5` — `locked_until = now + 15 min`.
- Before `locked_until` expires, login is rejected without a password check ("Account temporarily locked").
- A successful login resets `failed_attempts` and `locked_until`.
- Additionally: the constant 400 ms delay is kept; on escalation — WAF/Cloudflare (outside code).

## 4. Password change

- `/change-password` page: "current", "new", "repeat" fields; policy ≥10 characters — the same as in `password.ts`.
- Server Action `changePasswordAction`: `verifyPassword` → PBKDF2 hash of the new one → UPDATE + `must_change_password = 0`
  → all other sessions of the user are invalidated (DELETE from `sessions` by `user_id`, except the current one).
- `requireUser()` at `must_change_password=1` and a route ≠ `/change-password`, `/login` → `redirect('/change-password')`.
- "Forgot password" — outside the app: the admin resets via admin-UI (§5), generating a one-time password.

## 5. Admin-UI (`/admin/users`, role=admin, checked on the server)

- Users table: email, name, role, lock flag, creation date.
- Actions (Server Actions, each writes a record to `audit_log` with `actor_id`):
  - `createUser` — like `user:create`, but in the app; the password is generated and shown once;
  - `changeRole`, `lock/unlock` (`locked_until` manually), `resetPassword` (generation + `must_change_password = 1`);
  - self-protection: an admin cannot demote/lock themselves (last admin).
- `scripts/create-user.ts` is kept for local development and CI.

## 6. Invites

- An admin creates an invite (email + role) → a token is generated (32 bytes base64url), only SHA-256 in the DB;
  the `/invite/<token>` link is shown to the admin once.
- `/invite/<token>` page: validation (exists, unused, not expired) → a name-and-password setting form
  → `users` creation → `used_at`, auto-login.
- Lifetime 7 days; the list of active invites and revocation — in the admin-UI.

## 7. Acceptance criteria

1. 5 wrong passwords → 15-minute lockout, unlock by successful login after expiry / by admin.
2. `must_change_password=1` → forced redirect at login, normal work after the change; other sessions are logged out.
3. A non-admin has no access to `/admin/users` (404/redirect, not just UI hiding).
4. Invite: the full cycle — issuance, registration via the link, repeated use is rejected.
5. All user mutations are visible in `audit_log`.
