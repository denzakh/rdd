# Deployment and operations: Cloudflare Workers + D1 + CI (./deployment.md)

**Status:** operational document (not a spec) — describes how the system is deployed and **currently**
runs: Cloudflare resources, manual deploy, GitHub Actions, working with the production database,
rollback and troubleshooting.
**Relies on:** `wrangler.jsonc`, `package.json` (scripts), `scripts/*`, `.github/workflows/ci.yml`,
[nfr.md](./nfr.md) (RTO/RPO), [schema-evolution.md](./schema-evolution.md) (schema evolution).

> **Who this is for.** The document deliberately spells things out: it assumes the reader has never
> deployed a Next.js app to Cloudflare and never worked with D1. Every command is given in full,
> with the expected result and the reason behind it. If you only need the cheat sheet — see §0 and §11.

---

## 0. TL;DR — cheat sheet

```bash
# First deploy (done once)
npx wrangler login                 # browser: sign in to the Cloudflare account
npm ci                             # install exactly what the lockfile pins
npm run deploy                     # build + upload; Cloudflare creates the rdd.ux42.studio domain
npm run db:migrate:remote          # create the schema in the remote D1 (migrations 0001–0007)
npm run user:create:remote         # the first user automatically becomes admin
npm run seed:demo:remote           # (optional) demo patients

# Regular code update
git push                           # GitHub Actions runs the checks
npm run deploy                     # production switches atomically; data untouched

# Production DB from scratch + demo data
npm run db:restart:remote:seed     # dump → DROP tables → migrations → demo data

# Roll the code back to the previous version
npx wrangler rollback
```

> **Windows:** before `npm run deploy`, stop `npm run dev` (otherwise you get `EPERM`) and make sure
> `npx wrangler --version` is >= 4.141 (older versions fail with `…resvg.wasm?module`).
> Details and commands — see §9.

Step 4 is deliberately `npm ci`, not `npm i`: `ci` installs strictly from `package-lock.json` and
wipes `node_modules` first, so production ships exactly what CI has verified. `npm i` may silently
update the lockfile and drift from it. If `npm ci` fails — see §9 (usually a running dev server or
a damaged `node_modules`).

What lives where:

| Thing                               | Physical location                     | Created by                               |
| ----------------------------------- | ------------------------------------- | ---------------------------------------- |
| Worker code `rdd`                   | Cloudflare account owning the zone    | `npm run deploy`                         |
| Static assets (`_next/static` etc.) | Cloudflare, assets of the same worker | `npm run deploy`                         |
| Database                            | Cloudflare D1 `rdd` (`5a15f362-…`)    | created once (`wrangler d1 create`)      |
| Domain `rdd.ux42.studio`            | Cloudflare, worker Custom Domain      | `npm run deploy` (from `wrangler.jsonc`) |
| DB schema                           | the repository, `migrations/*.sql`    | `npm run gen:d1` + manual files          |
| Code checks                         | GitHub Actions                        | push to `main` or a Pull Request         |

The "repository → Cloudflare" mapping is also shown in
[architecture-overview.md](./architecture-overview.md) (C4: L2 Container).

---

## 1. What we actually deploy (the model in plain words)

**A typical web app** ships to a server (VPS/container): a Node process runs there, nginx sits in
front, a database sits next to it, and deploying means copying files and restarting the process
(hence "downtime windows").

**Here it is different.** The app is Next.js, but in production it is **not a Node process** — it is a
single **Worker**: an isolated JS program that Cloudflare runs on its edge nodes. There is no separate
server: nothing to restart, no nginx to configure, no "port 3000".

How Next.js becomes a Worker:

1. `opennextjs-cloudflare build` (inside `npm run deploy`) compiles the app into
   `.open-next/worker.js` (entry point, `"main"` in the config) and `.open-next/assets/**` (static files).
2. `opennextjs-cloudflare deploy` calls `wrangler deploy`, which uploads the result to the Cloudflare
   account as a worker named **`rdd`**.

**The database is D1** (managed SQLite). The key point: the worker **does not connect to a database
with a host, user and password**. Instead the config declares a **binding** — a "wire" from code to a
resource (`DB → database rdd`) — and in code it looks like `env.DB`. Host, port and password do not
exist as concepts, which is why the app needs no secrets (see §10).

**Static assets** travel with the same worker: the `.open-next/assets` directory is declared as the
`ASSETS` binding and Cloudflare serves those files directly, without running the app.

So the app has three addresses:

| Address                             | What it is                        | When it is used                                   |
| ----------------------------------- | --------------------------------- | ------------------------------------------------- |
| `http://localhost:3000`             | `npm run dev` — plain Next dev    | Development                                       |
| `https://rdd.<account>.workers.dev` | the worker's service address      | Created automatically on deploy; handy for checks |
| `https://rdd.ux42.studio`           | Custom Domain (your own hostname) | Production address for clinics and demos          |

**Deploying** means uploading a new version of the code. Cloudflare creates a new worker version and
**atomically** switches traffic to it: there is no "half old, half new" state. The database is **not
touched** by a deploy — neither rows nor schema.

---

## 2. Map of the files that affect deployment

| File                                  | Role                                                                                                            | What goes wrong if you break it                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `wrangler.jsonc`                      | The worker's "passport": name, entry point, bindings, domain                                                    | Wrong resource/domain is created, the DB wiring is lost                                       |
| `open-next.config.ts`                 | OpenNext settings (defaults now; R2 cache variant in comments)                                                  | Wrong ISR cache → stale pages                                                                 |
| `next.config.ts`                      | Next settings + `initOpenNextCloudflareForDev()` (bindings in `next dev`)                                       | `npm run dev` has no `env.DB`                                                                 |
| `package.json` → `scripts`            | What each `npm run …` command actually does                                                                     | Running the wrong step (`wrangler deploy` instead of `npm run deploy`)                        |
| `.github/workflows/ci.yml`            | The checks on push/PR                                                                                           | Red CI, or worse, a falsely green one                                                         |
| `migrations/*.sql`                    | Production DB schema: `0001` generated baseline, `0002–0007` manual                                             | Production without new tables/columns                                                         |
| `scripts/gen-d1.ts`                   | Migration generator fed by the TS field registry                                                                | Registry and DB schema drift apart                                                            |
| `scripts/db-restart.ts`               | Full reset of the **local** DB (baseline + manual migrations)                                                   | Loss of local data (fine for the dev database)                                                |
| `scripts/db-restart-remote.ts`        | Full reset of the **production** D1 (+ optional seeding)                                                        | Loss of production data (mitigated by the dump, see §5.6)                                     |
| `scripts/ensure-local-db.ts`          | Applies migrations before integration tests when needed                                                         | Tests fail with "no such table"                                                               |
| `scripts/seed-demo.ts`                | Demo data (local and remote)                                                                                    | Demo numbers skew real reports                                                                |
| `scripts/create-user.ts`              | User creation (the first user becomes admin)                                                                    | No access to the production DB after a reset                                                  |
| `image-loader.ts`                     | Custom `next/image` loader (uses `/cdn-cgi/image/…`)                                                            | Images are not served — see §9, the Image Resizing row                                        |
| `scripts/patch-opennext-turbopack.ts` | Patches `node_modules/@opennextjs/cloudflare` for Windows (backslashes in traced paths); wired to `postinstall` | Without it the Turbopack build "succeeds" but production returns 500 on every page (§5.2, §9) |
| `.open-next/`                         | Build artifact (not stored in git)                                                                              | A bare `wrangler deploy` ships a stale build                                                  |

Next: the config explained line by line, the difference between local and production, and the full
deployment path.

---

## 3. Reading `wrangler.jsonc` — what is there and why

```jsonc
{
  "name": "rdd", // (1) the worker's name in Cloudflare
  "main": ".open-next/worker.js", // (2) entry point — produced by the build
  "compatibility_date": "2026-03-01", // (3) runtime "dialect"
  "compatibility_flags": ["nodejs_compat"], // (4) enable Node-compatible APIs
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "rdd",
      "database_id": "5a15f362-…",
      "migrations_dir": "migrations",
    },
  ], // (5)
  "routes": [{ "pattern": "rdd.ux42.studio", "custom_domain": true }], // (6)
  "assets": { "binding": "ASSETS", "directory": ".open-next/assets" }, // (7)
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "rdd" }], // (8)
  "observability": { "enabled": true }, // (9)
}
```

1. **`name`** — the worker's name in Cloudflare. The same value is used in point (8) as the service
   name: **these two must match**. Rename the worker and a _second_ worker gets created, while the
   self-reference keeps pointing at the old name.
2. **`main`** — the file Cloudflare executes. It is produced by `opennextjs-cloudflare build` and is
   not stored in git. That is why "deploy" always means "build + upload", never "upload what is in
   the repository".
3. **`compatibility_date`** — Cloudflare evolves its runtime (`workerd`) and behaviour may change.
   The date pins the "dialect": no surprises from platform updates until the date is bumped on purpose.
4. **`nodejs_compat`** — enables a set of Node-compatible APIs (needed by Next.js and OpenNext).
   Without it the app fails at startup.
5. **The D1 database**: `binding: "DB"` is the name the database has in code (`env.DB`);
   `database_name` is the human-readable name in the account; `database_id` is the database identity
   (`5a15f362-…`); `migrations_dir` is the folder of `.sql` migrations applied by
   `wrangler d1 migrations apply`. `database_id` is **not a secret** — see §10.
6. **Domain**: `custom_domain: true` means "Cloudflare creates the DNS record and the certificate for
   this hostname itself and attaches it to the worker". Details — §5.3.
7. **Assets**: the build's static files are served by Cloudflare directly (fast and cheap), not by
   the app code. In code they are available as `env.ASSETS`.
8. **`WORKER_SELF_REFERENCE`** — a service binding of the worker to itself: the worker can call
   itself. OpenNext's cache mechanism (page revalidation) needs this. Hence point (1) and this field
   must match — otherwise the deploy succeeds but caching/revalidation silently does not work.
9. **Observability** — enables worker logs and traces in the Cloudflare dashboard (see §5.4).

Notes about this config (why it no longer contains what it used to):
`r2_buckets` was removed (`MY_BUCKET` is unused by the code — it stays as groundwork for consent
scans), the `images` binding (`IMAGES`) is unnecessary because a custom loader (`image-loader.ts`) is
wired in, and the `global_fetch_strictly_public` flag was dropped (it is only needed for same-zone
global fetch, which we do not use); Smart Placement (`placement`) remains disabled.

**If you change bindings** — regenerate the TypeScript types, otherwise the editor and `tsc` will
complain about unknown `env` fields:

```bash
npm run cf-typegen     # wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts
```

---

## 4. Local world vs production — two different worlds

The classic beginner trap: **the same code runs locally and in production, but the data is different**.
Exactly one thing differs — where the `DB` binding points.

| What                      | Locally                                   | Production                                                    |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Which config is read      | the same `wrangler.jsonc`                 | the same `wrangler.jsonc`                                     |
| Where `env.DB` points     | an SQLite file in `.wrangler/state/v3/d1` | the remote D1 `rdd` (`5a15f362-…`)                            |
| Who supplies the bindings | `getPlatformProxy()` (wrangler), locally  | Cloudflare on deploy                                          |
| Who fills it with data    | `db:restart`, `seed:demo`, `user:create`  | `db:migrate:remote`, `seed:demo:remote`, `user:create:remote` |
| Cost of a mistake         | recreate the DB in 10 seconds             | a dump plus figuring out what was lost                        |
| Where it physically lives | `.wrangler/` (in `.gitignore`)            | in the Cloudflare account                                     |

Rules that keep the two apart:

1. **The `:remote` suffix means production.** `db:migrate:remote`, `seed:demo:remote`,
   `user:create:remote`, `db:restart:remote`. A command without the suffix works with the local DB.
2. Every `:remote` command asks for confirmation (type `prod`) or accepts `--yes`.
3. Wrangler output always contains `Resource location: local` or `remote` — that line answers the
   question "where am I writing right now".
4. `npm run db:list` (`wrangler d1 list`) lists the cloud databases — a quick way to confirm the
   production DB exists and that you are logged in.
5. The local DB can be wiped as often as you like: `npm run db:restart`, then `npm run user:create`.
   Production may only be wiped through `db:restart:remote` (which takes a dump first).

About the local run commands: `npm run dev` is a plain Next dev server (local D1 through
`initOpenNextCloudflareForDev`); `npm run dev:cf` runs locally in the Cloudflare runtime (a leftover
of the Pages approach, `wrangler pages dev`); `npm run preview` builds and starts `wrangler dev`, i.e.
the closest thing to a production check of the Worker (the README says the same: `npm run preview`
for the local CF runtime).

---

## 5. Deploy step by step

### 5.1. Logging in to Cloudflare (once, but tokens expire)

```bash
npx wrangler login     # opens the browser and asks you to confirm access
npx wrangler whoami    # prints the e-mail and account — the sanity check
```

Wrangler stores the OAuth token **outside the repository** (on Windows:
`%APPDATA%\xdg.config\.wrangler\config\default.toml`). Tokens expire over time, and then every
wrangler command fails with `Failed to fetch auth token: 400 Bad Request` and `Not logged in` — the
only cure is `npx wrangler login` again.

For automation (for example deploying from CI) the OAuth flow is replaced by the
`CLOUDFLARE_API_TOKEN` environment variable with `workers_scripts:write`, `workers_routes:write`,
`d1:write`, `zone:read` permissions.

### 5.2. Build and upload: `npm run deploy`

The command has two steps:

| Step | What it does                                                                                                                                                                                                | Time    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1    | `opennextjs-cloudflare build` — compiles Next.js into `.open-next/worker.js` + `.open-next/assets/**`                                                                                                       | minutes |
| 2    | `opennextjs-cloudflare deploy` → `wrangler deploy`: uploads code and assets, creates/updates the `rdd` worker, wires `DB`, `ASSETS`, the self-reference, enables observability and applies the domain rules | seconds |

What you need to keep in mind:

- **The OpenNext patch is applied before the build.** `npm ci` runs `postinstall` → `scripts/patch-opennext-turbopack.ts`.
  This is a required step on Windows: without it the Turbopack build technically succeeds, but the SSR
  chunks never reach the worker and **every** production page returns 500 (see §9). The script is
  idempotent, so you never have to run it by hand — a plain `npm ci` is enough. If `node_modules` was
  touched manually the patch may be gone: the check is in §9.
- A deploy creates a **new worker version** and switches traffic to it atomically. Rolling back means
  going to the previous version (§8).
- **A deploy does not touch D1 data**: migrations are a separate step (§5.5).
- The app needs **no secrets** — neither in Cloudflare nor in GitHub. Only the CLI needs access (§5.1).
- Helper commands: `npm run upload` — upload a version **without** switching traffic
  (`wrangler versions upload`; handy to "try on" a change); `npm run preview` — build and run locally
  in the CF runtime (`wrangler dev`).

### 5.3. The domain: how the worker gets a human-readable address

Right after the first deploy the worker is reachable at the service address
`https://rdd.<account-subdomain>.workers.dev` — it is created automatically, nothing to configure.
The nice address (`rdd.ux42.studio`) is a separate Cloudflare entity: an **attachment of a hostname to
the worker**. There are two ways to attach it:

| Way               | Who creates the DNS record                       | How it looks in the config                            | Comment                                                                                    |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Custom Domain** | Cloudflare (itself, on deploy, plus certificate) | `"pattern": "rdd.ux42.studio", "custom_domain": true` | Recommended for workers: DNS and certificate are managed by the worker                     |
| **Route**         | You do (A/AAAA/CNAME, proxied)                   | `"pattern": "rdd.ux42.studio/*"`                      | Works when the record already exists; the worker intercepts requests and no origin is used |

This project uses **Custom Domain**, which means the "domain creation" happens automatically during
`npm run deploy` — nothing has to be created by hand in the dashboard.

**A classic mistake (and what we did about it).** A manual DNS record with the same name **conflicts**
with the Custom Domain: Cloudflare refuses to create the attachment (an error like
`A DNS record with that name already exists`). In our case `rdd.ux42.studio` had a manual
`CNAME rdd → ux42.studio (Proxied)` — a placeholder record pointing nowhere. Until a worker sits
behind it, the browser gets **HTTP 522** ("the edge could not get a response from the origin") — that
is not an app failure, it means "the domain exists but nothing serves it yet". The fix: delete the
manual record and let Cloudflare create the Custom Domain on deploy (done).

If you do not want a custom domain at all, just delete the `routes` block from `wrangler.jsonc`: the
worker stays available at `rdd.<account>.workers.dev`. To change the domain, edit the single `pattern`
line (the new domain's zone must live in the same Cloudflare account).

### 5.4. Checking the live production

```bash
curl -I https://rdd.ux42.studio     # expect 200 or a 302 to /login
npx wrangler deployments list       # what was deployed and when (worker versions)
npx wrangler tail                   # live logs; Ctrl+C to exit
```

- After the **first** deploy with a new domain, the attachment and certificate may take a few minutes
  to complete. If you see 522 right away, wait 2–5 minutes and repeat `curl`.
- In the dashboard: `Workers & Pages → rdd → Deployments` (versions and timestamps),
  `Settings → Domains & Routes` (the domain attachment), and logs/traces thanks to
  `observability: true`.
- A sign the database is wired: `/login` renders, and after `user:create:remote` you can sign in
  (the pages read the `users` table).

### 5.5. Production data: three independent commands

Code deploys and database contents are deliberately separated. Production has three distinct operations:

| Task      | Command                      | What it does                                                                                                                                 |
| --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema    | `npm run db:migrate:remote`  | Applies `migrations/*.sql` (0001–0007) to the remote D1. Safe to re-run: already applied migrations are skipped (tracked in `d1_migrations`) |
| A user    | `npm run user:create:remote` | Creates a user. **The first user in the database always becomes `admin`**; the password is generated (`--gen-password`) or typed in          |
| Demo data | `npm run seed:demo:remote`   | Seeds demo patients (11 patients with phases). Asks for the "prod" confirmation or accepts `--yes`                                           |

Verify the result:

```bash
npx wrangler d1 execute rdd --remote --command "SELECT name FROM d1_migrations"
npx wrangler d1 execute rdd --remote --command "SELECT COUNT(*) AS patients FROM patients"
```

⚠️ Demo data skews the aggregates on `/reports` (they are computed over the whole database). If you
need clean numbers, do not seed — or reset the database first (§5.6).

### 5.6. Full production DB reset ("from scratch")

Script: `scripts/db-restart-remote.ts` (the remote counterpart of `scripts/db-restart.ts`).

```bash
npm run db:restart:remote        # dump → DROP tables → migrations
npm run db:restart:remote:seed   # the same + demo data
```

What happens, step by step, and why:

1. **Confirmation.** It asks you to type `prod` (or `--yes` for automation) — protection against an
   accidental production run.
2. **Dump (backup).** `npx wrangler d1 export rdd --remote` → `.wrangler/backups/rdd-<date_time>.sql`,
   and it prints the ready-to-use restore command. The `.wrangler` folder is in `.gitignore` — the
   dump contains patient data and must never reach git. Turn the dump off with `--no-backup`.
3. **DROP all tables** children first, parents last. Why the order matters: **D1 always enforces
   foreign keys** (the equivalent of `PRAGMA foreign_keys = on`), and `PRAGMA foreign_keys = off` is
   not available in D1. That is why the script derives the order from the DDL in `sqlite_master`
   (via `REFERENCES`) instead of hardcoding it. Engine-internal tables (`sqlite_*`, `_cf_*`) are
   excluded — dropping them yields `not authorized: SQLITE_AUTH`. The `d1_migrations` table is
   dropped on purpose: otherwise wrangler would assume the migrations were already applied and the
   schema would stay empty.
4. **Migrations.** `npx wrangler d1 migrations apply rdd --remote` — recreates the schema and records
   0001–0007 in `d1_migrations` again.
5. **Verification.** The script checks that every required table exists (`patients`, `phases`,
   `registry_versions`, `users`, `sessions`, `invites`, `audit_log`) and that 7 of 7 migrations were
   applied; on any mismatch it fails loudly instead of leaving a half-empty database.
6. **`--seed`** (optional) — runs the seeder: `seed-demo.ts --remote`.

After a reset **all users and sessions are gone**: nobody can sign in until you create an admin —
`npm run user:create:remote`.

Flags: `--yes` (no interactive confirmation), `--seed` (demo data), `--no-backup`, `--local` (run
against the local DB — for debugging the script itself, production is untouched).

Restoring from a dump (if you ever need it):

```bash
npx wrangler d1 execute rdd --remote --yes --file=".wrangler/backups/rdd-2026-09-21_22-27-00.sql"
```

The dump contains `CREATE TABLE` + `INSERT`, so it must be applied to an **empty** database (for
example right after a reset with `--no-backup`). If the reset happened within the last 30 days there
is a simpler route — restoring the whole database with Cloudflare's built-in Time Travel, see §8.

---

## 6. CI (GitHub Actions): why it exists and how it is built

### 6.1. Why it is not a "replacement" for Cloudflare but a different tool

|                  | Cloudflare (wrangler/OpenNext)                                                                          | GitHub Actions (CI)                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| What it does     | Delivery and runtime: build-upload, worker versions, atomic switching, domain and certificate, logs, D1 | Code checks: `lint`, types, FSD boundaries, unit and integration tests |
| What it does not | Knows nothing about FSD, does not run vitest, does not compare `package.json` with `package-lock.json`  | Does not deploy production (by default)                                |
| When it runs     | When you run `npm run deploy` yourself                                                                  | On every push to `main` and on every Pull Request                      |

A good example of why both are needed: at some point the repository carried an incomplete
`package-lock.json` (it was missing `esbuild@0.28.2`). Locally everything "worked" — `npm install` /
`npm ci` on npm 11 tolerated it and `npm run deploy` succeeded. CI (npm 10 on Node 22) failed on its
**very first step** with `EUSAGE`, and every later check was skipped. In other words, the red CI was
the only signal that installation was not reproducible.

### 6.2. Reading `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5 # 1. clone the repository
      - uses: actions/setup-node@v5 # 2. install Node + npm cache
        with:
          node-version: 24
          cache: npm
      - run: npm ci # 3. install strictly from package-lock.json
      - name: Lint # 4. ESLint
        run: npm run lint
      - name: Typecheck # 5. TypeScript
        run: npx tsc --noEmit
      - name: FSD layers (steiger) # 6. FSD layer boundaries
        run: npm run steiger
      - name: Unit tests # 7. tests/unit (no DB)
        run: npx vitest run
      - name: Integration tests (local D1) # 8. tests/integration on local D1
        run: npm run test:db
```

What each step catches:

| Step               | What it verifies                                                     | Example defect                                                 |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `npm ci`           | `package.json` and `package-lock.json` agree                         | Incomplete lockfile (`Missing: esbuild@0.28.2 from lock file`) |
| `npm run lint`     | Style and suspicious code (0 errors; warnings do not fail the build) | Any ESLint error                                               |
| `npx tsc --noEmit` | Types across the project (including `scripts/`)                      | A typo in a registry field name                                |
| `npm run steiger`  | FSD architectural boundaries (who may import whom)                   | Importing `widgets` into `entities`                            |
| `npx vitest run`   | Logic without a DB (`tests/unit`, 22 files)                          | Broken validation/CAS logic                                    |
| `npm run test:db`  | SQL repositories and schema on local D1 (`tests/integration`)        | A wrong query, a missing column                                |

About Node 24 and actions `@v5`: GitHub used to print `Node.js 20 is deprecated … actions/checkout@v4,
actions/setup-node@v4` because the actions themselves run on an old runtime. Major versions `v5` and
above declare the `node24` runtime, which is why the workflow uses `@v5` (the first major without
behaviour changes). Node 24 is the current LTS and ships npm 11, so local installs and CI installs use
the same npm major.

One important detail: CI runs on a **clean** machine, so the integration tests there see an empty
database. Locally the database is usually not empty (demo data) — see §9, the aggregates row.

### 6.3. The lockfile rule (so CI does not go red for no reason)

1. Change dependencies → commit **both** files: `package.json` and `package-lock.json`.
2. Verify locally exactly the way CI does: **`npm ci`** (not `npm install`). `npm ci` deletes
   `node_modules` and installs strictly from the lockfile — that is how reproducibility is checked.
3. If `npm ci` fails with `EUSAGE … Missing: X from lock file`, the lockfile is incomplete: fix it
   with `npm install --package-lock-only` and commit the result.
4. Keep your local Node/npm on the same major line as CI (the current target is "CI = Node 24 =
   npm 11"). A different npm major may "not notice" what CI considers an error — that is exactly how
   the `esbuild` case above happened.
5. Never hand-edit `package-lock.json` and never delete it from the repository: it is the guarantee
   that everyone (CI and production) installs the same dependency versions.

### 6.4. Reading a red CI run, and why CI does not deploy

- On the run page (`GitHub → Actions`) you can see which step failed; steps below it are marked
  `skipped`. That is an important signal: if `npm ci` failed, **no** tests ran at all, so there never
  was a "green build".
- Reproduce locally: the same commands in the same order. For integration tests remember the
  "empty database" rule (§9, aggregates row).
- **CI does not deploy anything.** A green CI means "the code was checked", not "production is
  updated". Production is updated only manually: `npm run deploy`. That is intentional (the demo is
  deployed from a local environment, see [spec-stage-4.md](./spec-stage-4.md) §4) and it is also
  reflected in [nfr.md](./nfr.md): "deploy stays manual", RTO is not guaranteed, and the disaster path
  is a re-deploy from Git.
- If you later want automatic deploys: add a `deploy` job to the same workflow that runs after `ci`
  and calls `npm run deploy` using a `CLOUDFLARE_API_TOKEN` secret. Then manual work remains only for
  emergencies.

---

## 7. Typical scenarios: what to do when…

### 7.1. You changed code (UI, logic, queries)

```bash
npm ci && npm run lint && npx tsc --noEmit && npx vitest run   # or simply npm run test
git add -A && git commit -m "…" && git push                    # CI checks it
npm run deploy                                                 # production is updated
```

### 7.2. You changed the field registry (added/renamed a field)

The registry is the source of truth; the schema is generated from it
([schema-evolution.md](./schema-evolution.md)):

```bash
npm run gen:d1          # regenerate migrations from the registry
npm run db:restart      # recreate the local DB and verify everything applies
npm run test            # and that the code still works
git add -A && git commit -m "…" && git push
npm run deploy          # code to production (the production schema is still old)
npm run db:migrate:remote   # production schema: apply the new migrations
```

The "code → migration" order is deliberate: old code with the old schema works, new code without the
new column does not. The other order would leave a broken window between the two steps.

### 7.3. You want a clean production environment with demo data (for a demo)

```bash
npm run db:restart:remote:seed    # dump → DROP → migrations → 11 demo patients
npm run user:create:remote        # mandatory: users were deleted with the database
```

### 7.4. You change the domain or drop it

- a different domain: edit `pattern` in `wrangler.jsonc` → `npm run deploy` (the zone must belong to
  the same Cloudflare account);
- no domain at all: delete the `routes` block → `npm run deploy`; the worker stays on
  `rdd.<account>.workers.dev`;
- after a domain change, existing sessions/cookies remain bound to the old hostname — expected.

### 7.5. You add a new binding (for example R2 for consent scans)

1. declare the binding in `wrangler.jsonc` (same shape as `d1_databases`);
2. regenerate the types: `npm run cf-typegen` (otherwise `tsc` cannot see the new `env` field);
3. use it in code (`env.MY_BUCKET`), add tests;
4. `git push` → CI; `npm run deploy`.

The groundwork is described in [consent.md](./consent.md) (creating an R2 bucket and authorized
downloads are beyond the demo's scope).

---

## 8. Rollback and recovery (what to do when something breaks)

### 8.1. Rolling back the code (the worker)

```bash
npx wrangler deployments list                         # the 10 most recent deploys: id, date, author
npx wrangler deployments status                       # what is serving production right now
npx wrangler rollback                                 # go back to the previous version
npx wrangler rollback <version-id> -m "reason"        # go back to a specific version
```

Rolling back code **does not change** D1 data. If the schema or the data broke rather than the code,
see 8.2.

### 8.2. Restoring D1 data

Three levels, from "fast and precise" to "rough but reliable":

| Approach                                     | When it applies                                      | How                                                                                                                                                  | Limitations                                                                                                                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time Travel** (built into D1)              | "we corrupted data" minutes-to-days ago              | `npx wrangler d1 time-travel info rdd` → bookmark; then `npx wrangler d1 time-travel restore rdd --bookmark=<…>` (or `--timestamp=<unix / RFC3339>`) | History: **30 days** on Workers Paid, **7 days** on Workers Free. A restore **overwrites the whole database**, in-flight queries are dropped, and the output returns a bookmark that undoes the restore itself |
| **Dump from `.wrangler/backups/`**           | a fresh dump exists (created by `db:restart:remote`) | `npx wrangler d1 execute rdd --remote --yes --file="<dump>"`                                                                                         | The dump contains `CREATE TABLE`, so apply it to an **empty** database                                                                                                                                         |
| **Full reset** (`npm run db:restart:remote`) | you need a guaranteed clean state                    | see §5.6                                                                                                                                             | Data is lost (a dump remains), users must be recreated                                                                                                                                                         |

Time Travel needs no enabling and is not billed separately. Whether your database supports it is
visible in `npx wrangler d1 info rdd`: `version: production` means the new Time Travel API,
`version: alpha` means the legacy snapshots (very old databases).

### 8.3. "Production is down" — the order of investigation

1. `curl -I https://rdd.ux42.studio` — see what actually answers (status code, presence of `cf-ray`).
2. `npx wrangler tail` — watch worker errors in real time.
3. `npx wrangler deployments list` and the dashboard (`Deployments`) — was there a recent deploy or
   migration?
4. Then follow the symptom: code → `wrangler rollback`; data → Time Travel; domain/account → §9.

How this relates to the NFRs: the demo provides **no availability guarantees**, RTO/RPO are not
committed, and there are no scheduled backups or recovery runbook — deliberately out of scope (see
[nfr.md](./nfr.md) §1–2 and "Backup / DR" in [architecture-overview.md](./architecture-overview.md)).
Everything above is what you can actually use, not an SLA.

---

## 9. Troubleshooting: symptom → cause → what to do

| Symptom                                                                                                                                                                   | Cause                                                                                                                                                                                                                                                                                                                                                                                                                                       | What to do                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The domain returns **HTTP 522**                                                                                                                                           | The domain exists but no worker is attached to it (no Custom Domain / a manual DNS record)                                                                                                                                                                                                                                                                                                                                                  | `npm run deploy`. If the deploy complains about a conflicting record, delete the manual record (next row)                                                                                                                                                                                                                                                                                                                     |
| Deploy: `A DNS record with that name already exists`                                                                                                                      | A manual DNS record conflicts with the Custom Domain                                                                                                                                                                                                                                                                                                                                                                                        | Delete that record under `DNS → Records`, rerun `npm run deploy`                                                                                                                                                                                                                                                                                                                                                              |
| `Not logged in` / `Failed to fetch auth token: 400 Bad Request`                                                                                                           | The CLI OAuth token expired                                                                                                                                                                                                                                                                                                                                                                                                                 | `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`)                                                                                                                                                                                                                                                                                                                                                                          |
| CI: `npm ci` fails with `EUSAGE … Missing: X from lock file`                                                                                                              | The lockfile is incomplete / out of sync with `package.json`                                                                                                                                                                                                                                                                                                                                                                                | `npm install --package-lock-only`, commit `package-lock.json`; verify locally with `npm ci`                                                                                                                                                                                                                                                                                                                                   |
| `npm ci` → `EPERM: unlink … next-swc.win32-x64-msvc.node`                                                                                                                 | The file is held by a running dev server (`npm run dev` / `dev:cf` — `node.exe` processes)                                                                                                                                                                                                                                                                                                                                                  | Stop the dev server first (`Ctrl+C`), then retry `npm ci`                                                                                                                                                                                                                                                                                                                                                                     |
| `npm ci` → `command failed … husky` / `'husky' is not recognized`                                                                                                         | The `prepare` script runs `husky`, which is missing from `node_modules`: the install was interrupted or `node_modules` is damaged. **Not** necessarily "outside git" — check `git rev-parse` first                                                                                                                                                                                                                                          | Full reinstall: `npm ci`. Diagnostics: `npm ls husky` (should report `husky@9.1.7`). To only install dependencies without the git hooks — `npm ci --ignore-scripts`                                                                                                                                                                                                                                                           |
| After a bare `npx wrangler deploy` you see "old code"                                                                                                                     | It shipped the stale build from `.open-next/`                                                                                                                                                                                                                                                                                                                                                                                               | Always deploy via `npm run deploy` (build + upload)                                                                                                                                                                                                                                                                                                                                                                           |
| Production: `no such table: …` / empty lists                                                                                                                              | Migrations were not applied to the remote D1                                                                                                                                                                                                                                                                                                                                                                                                | `npm run db:migrate:remote` (the local `db:restart` does not touch production)                                                                                                                                                                                                                                                                                                                                                |
| You cannot sign in to production (no user)                                                                                                                                | The database was reset → `users` is empty                                                                                                                                                                                                                                                                                                                                                                                                   | `npm run user:create:remote` (the first user becomes admin)                                                                                                                                                                                                                                                                                                                                                                   |
| Local integration aggregate tests fail (`expected 34 to be 2`)                                                                                                            | The local DB is not empty — demo data skews aggregates                                                                                                                                                                                                                                                                                                                                                                                      | `npm run db:restart` before `npm run test:db`; CI has an empty DB, so it is green there ([spec-stage-4.md](./spec-stage-4.md) §3)                                                                                                                                                                                                                                                                                             |
| Images are not served (404) in production                                                                                                                                 | `image-loader.ts` builds `/cdn-cgi/image/…` but Image Resizing is not enabled in the zone                                                                                                                                                                                                                                                                                                                                                   | Enable Image Resizing in the zone, or temporarily use direct image paths                                                                                                                                                                                                                                                                                                                                                      |
| `npm run dev` has no `env.DB`                                                                                                                                             | The dev-mode bindings were not initialised                                                                                                                                                                                                                                                                                                                                                                                                  | Check `initOpenNextCloudflareForDev()` in `next.config.ts` and that `wrangler.jsonc` exists                                                                                                                                                                                                                                                                                                                                   |
| Production returns 500 right after a deploy                                                                                                                               | Usually a code/schema mismatch, or the worker name and the self-reference disagree                                                                                                                                                                                                                                                                                                                                                          | `npx wrangler tail`; verify `name` == `services[].service`; roll back with `npx wrangler rollback` if needed                                                                                                                                                                                                                                                                                                                  |
| Deploy on Windows fails: `Missing file or directory: …\resvg.wasm?module`                                                                                                 | An old `wrangler` (< 4.141) writes the wasm module with a `?module` suffix in the file name, and `?` is not allowed in Windows file names. The bug is invisible on Linux/CI                                                                                                                                                                                                                                                                 | Bump the dev dependency: `npm i -D wrangler@^4.141.0` (updates `package.json` + `package-lock.json`); verify with `npx wrangler deploy --dry-run`                                                                                                                                                                                                                                                                             |
| `EPERM` / `EBUSY` from `npm run db:restart` or from the `.open-next` build                                                                                                | A local dev server (`npm run dev` / `dev:cf`, workerd) still holds `.wrangler/state/v3/d1` and `.open-next`                                                                                                                                                                                                                                                                                                                                 | Stop the dev server first (`Ctrl+C`, killing `node.exe`/`workerd.exe` if needed), then retry. If `.open-next` cannot be deleted, run `rmdir .open-next\assets` (it is a junction on Windows)                                                                                                                                                                                                                                  |
| **Every** production route returns 500, with `ChunkLoadError: Failed to load chunk server/chunks/ssr/…` or `components.ComponentMod.handler is not a function` in the log | **The Windows OpenNext + Turbopack bug.** The `patches/plugins/turbopack.js` plugin filters traced files with `file.includes(".next/server/chunks/")` and rewrites the path via `chunk.replace(/.*\/\.next\//, "")` — both expect POSIX slashes, while on Windows the paths come with backslashes. Result: the `switch` in `requireChunk()` comes out empty, SSR chunks are not inlined, and every page fails. Not reproducible on Linux/CI | Check that the patch is applied: `npx tsx scripts/patch-opennext-turbopack.ts` → it must print `✅ Патч OpenNext (Windows, traced-файлы) применён`, and `grep -c "rdd:patch:win-traced-files" node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/turbopack.js` must print `1`. Then **rebuild** (`rm -rf .next .open-next && npm run deploy`) and deploy. The script is idempotent, re-running it is harmless |
| Same 500, but the patch is applied (marker = 1)                                                                                                                           | The patch only fixes the paths; the build has to run **after** it is applied. The usual trap: `npm ci`/`npm install` reinstalled `node_modules` and wiped the patch, while the deploy reused a stale `.open-next`                                                                                                                                                                                                                           | Order: `npm ci` → (postinstall applies the patch itself) → `rm -rf .next .open-next` → `npm run deploy`. Verify that `.open-next/server-functions/default/handler.mjs` contains `case "chunks/ssr/…` — that proves the chunks are really inlined                                                                                                                                                                              |
| There is no official OpenNext patch yet — a workaround is needed                                                                                                          | Expected: the patch lives in `node_modules` and only survives `npm ci`. The alternative is webpack instead of Turbopack: `"build": "next build --webpack"` in `package.json`                                                                                                                                                                                                                                                                | Both strategies work. Turbopack + patch is faster and stays the default; webpack does not depend on this bug at all, but it is slower and requires that `'use client'` components do **not** import server modules (`node:crypto` and the like) — otherwise you get `UnhandledSchemeError: Reading from "node:crypto"`                                                                                                        |
| Scripts fail with: `Unexpected non-whitespace character after JSON at position …`                                                                                         | Since `wrangler` 4.141, `d1 execute --json` prints an **array** `[{…}]`, not an object `{…}`. A parser that looks for the first `{` and reads to the end trips over the closing `]`                                                                                                                                                                                                                                                         | Parse both shapes (as `scripts/seed-demo.ts` and `scripts/db-restart-remote.ts` already do). To debug: `npx wrangler d1 execute rdd --remote --json --command "SELECT …" \| head` and check the first character: `[` or `{`                                                                                                                                                                                                   |
| Verifying a row in the DB fails even though the row was created                                                                                                           | `wrangler d1 execute --file=…` answers with a **summary** (`Total queries executed`, `Rows read`), not with `SELECT` rows — there is nothing to assert on                                                                                                                                                                                                                                                                                   | Run the verification `SELECT` via `--command "SELECT …"`, not `--file`. Same approach in `scripts/create-user.ts`                                                                                                                                                                                                                                                                                                             |
| CI is red on `steiger`/`tsc` while it "worked locally"                                                                                                                    | A different Node/npm version, or uncommitted files                                                                                                                                                                                                                                                                                                                                                                                          | Repeat the commands in the same order on the same Node version (see §6.3)                                                                                                                                                                                                                                                                                                                                                     |

General rule: **first determine the layer that failed** — worker code, domain attachment, account
access or data. These are independent contours, and each has its own command.

---

## 10. Secrets and sensitive data

**The app needs no secrets.** There are no API keys and no external services in the code: the database
is reached through the `DB` binding and static files through `ASSETS`. Therefore:

- there are no GitHub secrets for the build or the tests;
- there are no runtime secrets in Cloudflare (`wrangler secret put` is not used);
- `.dev.vars*` is in `.gitignore` (it will only be needed if secrets appear).

**What is NOT a secret** (and it is fine that it lives in the repository):

| Data                         | Why it is not a secret                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database_id` (`5a15f362-…`) | It is an identifier, not an access key: without an account token it is useless — D1 is reachable only through worker bindings in your account. It is visible in the dashboard, in `wrangler` logs and in API calls anyway |
| Worker name, domain, routes  | Public information (resolvable via DNS by anyone)                                                                                                                                                                         |

**What is genuinely secret, and where it belongs:**

| Secret                                  | Where it lives                                                               | What not to do                                   |
| --------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| The wrangler OAuth token                | Outside the repository: `%APPDATA%\xdg.config\.wrangler\config\default.toml` | Never commit it, never paste it into a chat      |
| `CLOUDFLARE_API_TOKEN` (for automation) | An environment variable / CI secrets                                         | Never hardcode it in scripts or `wrangler.jsonc` |
| User passwords                          | In the DB, as PBKDF2 hashes only (see [auth.md](./auth.md))                  | Never log them or store them in plain text       |
| Database dumps                          | `.wrangler/backups/` (folder in `.gitignore`)                                | Never commit dumps — they contain patient data   |

If a token did leak into git: **revoke** it in the dashboard first (`My Profile → API Tokens`) and
only then clean up the history — revocation takes effect immediately, deleting a commit does not.

---

## 11. Checklists

### 11.1. First deploy (from scratch)

```bash
npx wrangler login                                  # 1. account access
npx wrangler whoami                                 # 2. sanity check: the account shows up
npx wrangler --version                              # 3. must be >= 4.141 (see §9 for the Windows issue)
npm ci                                              # 4. dependencies from the lockfile (postinstall applies the OpenNext patch itself, see §5.2/§9)
npm run deploy                                      # 5. build + upload + Custom Domain creation
curl -I https://rdd.ux42.studio                     # 6. expect 200/302 (the certificate may take minutes)
npm run db:migrate:remote                           # 7. production D1 schema
npm run user:create:remote                          # 8. the first admin
npm run seed:demo:remote                            # 9. (optional) demo data
```

You **must stop the local dev server** (`npm run dev`, `npm run dev:cf`) before
`npm run deploy`: it holds `.wrangler/state/v3/d1` and `.open-next`, and the build then fails with
`EPERM`. Step 3 matters on Windows — with `wrangler` < 4.141 the deploy fails with
`Missing file or directory: …\resvg.wasm?module` (see §9).

One more Windows-specific condition: the OpenNext patch from step 4 is mandatory — otherwise the
build succeeds while **every** production page returns 500 (`ChunkLoadError`). This is the least
obvious breakage in the chain, because `npm run deploy` still exits successfully (see §5.2 and §9).

Signs of success: the dashboard shows the worker `rdd` and the domain `rdd.ux42.studio`
(Domains & Routes); `curl` returns 200/302; signing in at `/login` works.

### 11.2. A regular release

```bash
npm ci && npm run test && npm run lint && npx tsc --noEmit && npm run steiger   # locally
git push                                                                        # CI checks it
# wait for a green CI
npm run deploy                                                                  # ship production
curl -I https://rdd.ux42.studio                                                 # verify
```

### 11.3. Before any production data operation

1. Make sure a dump will be taken (`db:restart:remote` does it automatically; otherwise run
   `npx wrangler d1 export`).
2. Remember that after a reset there are no users → plan `user:create:remote` right away.
3. After the operation verify `SELECT COUNT(*)` on the key tables and open `/login`.

### 11.4. Disaster recovery (in [nfr.md](./nfr.md) terms)

The demo has no SLA, so the "plan" is: clone the repository → `npm ci` → `npm run deploy` →
`npm run db:migrate:remote` (if the database is empty) or restore data via Time Travel / a dump.
RTO ≤ 4 h and RPO ≤ 1 h are **targets** for a production version, not current guarantees.

---

## 12. Glossary

| Term                                         | In plain words                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Worker                                       | An isolated JS program Cloudflare runs on its own network. Our worker is called `rdd`                               |
| `wrangler`                                   | The Cloudflare CLI: login, deploy, D1 operations, logs. Run as `npx wrangler …` or from npm scripts                 |
| OpenNext (`opennextjs-cloudflare`)           | The tool that turns a Next.js app into a Worker                                                                     |
| Binding                                      | A "wire" from the worker to an external resource (database, assets). Declared in `wrangler.jsonc`, used as `env.DB` |
| D1                                           | Cloudflare's managed database (SQLite). Ours is the `rdd` database, id `5a15f362-…`                                 |
| Assets                                       | The worker's static files, served by Cloudflare directly (`env.ASSETS` in code)                                     |
| Custom Domain                                | Attaching your own hostname to a worker, with Cloudflare creating the DNS record and certificate itself             |
| Route                                        | A rule for which hostname's requests go to the worker; you create the DNS record yourself                           |
| Version / Deployment                         | A worker code version and the fact that it serves traffic; deploying = new version + switch                         |
| `rollback`                                   | Going back to the previous worker version (data is not affected)                                                    |
| Bookmark / Time Travel                       | D1's built-in "time machine": restore points for the database (30 days on Paid, 7 days on Free)                     |
| `:remote` suffix                             | Marks a command that works against production instead of the local database                                         |
| `.open-next/`                                | The build output folder (not in git): the worker entry point and static assets                                      |
| `compatibility_date` / `compatibility_flags` | Runtime "dialect" settings: they pin behaviour and enable Node compatibility                                        |
| Self-reference binding                       | A binding of the worker to itself (`WORKER_SELF_REFERENCE`), required by the OpenNext cache                         |
| Lockfile (`package-lock.json`)               | The exact dependency version list; `npm ci` installs strictly from it                                               |
| CI                                           | GitHub Actions: the checks on push/PR. It does not deploy                                                           |

See also: [nfr.md](./nfr.md) (availability, RTO/RPO), [schema-evolution.md](./schema-evolution.md)
(schema evolution), [spec-stage-4.md](./spec-stage-4.md) §4 (the CI decisions),
[architecture-overview.md](./architecture-overview.md) (demo boundaries, "Backup / DR"),
[auth.md](./auth.md) (`user:create:remote`, roles), README (quick start).
