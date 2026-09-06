# eSign SaaS — Monorepo

An e-signature SaaS MVP. Turborepo-based monorepo.

## Structure

| Path | Package | Description |
|---|---|---|
| `apps/web` | `@repo/web` | Next.js 15 (App Router) + Tailwind CSS + Radix UI frontend |
| `apps/api` | `@repo/api` | NestJS API server (includes a `/health` health check) |
| `packages/db` | `@repo/db` | Prisma schema + PostgreSQL client |
| `packages/ui` | `@repo/ui` | Shared UI primitives (`cn` helper, etc.) |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configuration |
| `packages/eslint-config` | `@repo/eslint-config` | Shared ESLint configuration |

## Requirements

- Node.js >= 22.18 — the built API loads `@repo/db` from TypeScript source, which
  relies on Node's built-in type stripping (unflagged since 22.18)
- pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- PostgreSQL 16 and Redis 7 — `docker compose up -d` starts both locally

## Configuration

Every setting is an environment variable. Nothing is read from a committed
config file and no secret has a production default. `.env.example` lists all of
them with values that are safe for local use only.

| Variable | Required | What it does |
|---|---|---|
| `PORT` | injected by the platform | The single port the server listens on. Falls back to `API_PORT`, then `3001`. No port is hardcoded anywhere. |
| `DATABASE_URL` | yes | PostgreSQL connection string. Used by the server, the migrations and the seed. |
| `REDIS_URL` | no | BullMQ queue behind completion e-mails and notifications. Leave it unset to log those jobs to the console instead. |
| `JWT_SECRET`, `SHARE_JWT_SECRET`, `SHARE_LINK_ENCRYPTION_KEY` | yes in any shared env | Sender sessions, recipient share sessions, and at-rest encryption of share-link passwords. The committed defaults are dev placeholders — replace them. |
| `NEXT_PUBLIC_API_URL` | no | Origin the browser uses to reach the API. Leave it unset for the single-port run; the client then calls `/api/…` on the page's own origin. Inlined at build time, so changing it requires a rebuild. |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NAME` | no | Override the dummy account created by the seed. |

Two things about how these are loaded, because they decide where you have to
put them:

- **`.env` is read by one process only** — the server, and only when it starts
  from the repository root (which is what `pnpm start` does). Prisma's CLI, the
  seed script and the dev servers each run from their own workspace directory,
  so a root `.env` is invisible to them. Export the values into your shell
  before running those.
- **Plain HTTP throughout.** TLS is terminated upstream; nothing here redirects
  to https or reads a certificate.

## Running the app (single port)

One process, one port. The API owns `$PORT` and serves the built web app on
every path it does not own itself (`/api/*` and `/health` stay with the API).
This is the path the platform's preview takes, and it works against a
green-field database.

```bash
# 1. Install dependencies
corepack enable && pnpm install

# 2. Start Postgres + Redis (skip when the platform provides them)
docker compose up -d

# 3. Build: Prisma client → API (nest) → web app (next)
pnpm build

# 4. Point the app at the database and the cache
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/esign?schema=public'
export REDIS_URL='redis://localhost:6379'

# 5. Migrate, seed and boot, in that order
PORT=8080 pnpm start
```

Do **not** export `NODE_ENV=development` before step 3 — `next build` refuses to
emit a production build under it and fails while prerendering. A `.env` file on
disk is harmless during the build; only the exported value matters.

Confirm it is up:

```bash
curl -i http://localhost:8080/         # 200, the app's first screen
curl -s http://localhost:8080/health   # {"status":"ok",...}
```

Then sign in at <http://localhost:8080/login> with the [dummy account](#dummy-account).

`pnpm start` is three steps under one command, and each is idempotent:

| Step | Command | Effect |
|---|---|---|
| 1 | `pnpm db:deploy` | Apply every committed migration file. Never prompts, never generates a migration. |
| 2 | `pnpm db:seed` | Upsert the dummy sender and one sample document. |
| 3 | `node apps/api/dist/main.js` | Bind `$PORT`, serve the API under `/api` (+ `/health`) and the web app on everything else. |

Because all three converge rather than append, a restart against an existing
database is a no-op that leaves the dummy account's documented credentials in
place. That is why they can run on every boot.

The platform's preview reads the same two commands from `preview.toml`
(`model = "server"`, build `pnpm build`, serve `pnpm start`, `port_env = "PORT"`),
which exists because auto-detection cannot infer a monorepo whose runtime
entrypoint is the API process rather than either workspace on its own.

### Migrating and seeding on their own

Both commands read `DATABASE_URL` from the process environment and do **not**
load `.env` themselves, so export it first — or let the platform inject it:

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/esign?schema=public'

pnpm db:deploy   # apply every migration in packages/db/prisma/migrations
pnpm db:seed     # create the dummy sender + sample document
```

Use `pnpm db:deploy` (not `db:migrate`) anywhere non-interactive — a preview
release step, CI, a deployment. `pnpm db:migrate` is `prisma migrate dev`: it
authors new migration files and prompts, which is what you want while changing
the schema and never what you want on a server.

Running either against an empty database, or twice in a row, ends in the same
state with no duplicate rows. The seed upserts on stable keys — the sender on
its email, the sample document on a fixed id — and re-asserts the documented
credentials on every run, so a drifted demo password is restored rather than
duplicated. Unrelated rows are never touched, and the sample document's
status and timestamps are left alone once it exists.

### Dummy account

| Field | Default | Override |
|---|---|---|
| Email | `demo@example.com` | `SEED_USER_EMAIL` |
| Password | `demo-password-123` | `SEED_USER_PASSWORD` |
| Name | `Demo Sender` | `SEED_USER_NAME` |

These defaults are for local and preview environments only. Set
`SEED_USER_PASSWORD` to a strong value in any shared environment — the seed
hashes it with bcrypt and never logs or stores the plaintext. The email is
lowercased before it is stored, matching how login normalizes it.

The seed also creates one sample document (`Sample contract (seed data)`, status
`DRAFT`) owned by that account. Only the database row is seeded — no PDF bytes
are written to object storage — so the sample appears in the document list but
has no file behind it. Upload a real PDF to exercise the full signing flow.

## Local development (two servers)

Development runs web and API as separate processes on separate ports, so the
browser has to be told where the API is. This is the one mode where
`NEXT_PUBLIC_API_URL` should be set.

```bash
# 1. Install and prepare environment variables
pnpm install
cp .env.example .env
```

Uncomment `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env`, then:

```bash
# 2. Export everything into the shell — the dev servers and the db scripts
#    read the process environment, not the root .env
set -a; . ./.env; set +a

# 3. Start local infrastructure
docker compose up -d

# 4. Generate the Prisma client, apply migrations, seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run both dev servers
pnpm dev
```

- web: <http://localhost:3000>
- api: <http://localhost:3001> (health: <http://localhost:3001/health>)

Before going back to the single-port build, re-comment `NEXT_PUBLIC_API_URL` and
start a fresh shell — the value is baked into the client bundle at build time,
and `NODE_ENV=development` from `.env` breaks `next build`.

## Key scripts (repo root)

| Command | Description |
|---|---|
| `pnpm build` | Generate the Prisma client, then build the api + web workspaces |
| `pnpm start` | Migrate, seed, and run the built app on `$PORT` (single port) |
| `pnpm dev` | Run web/api concurrently via turbo (two servers) |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Type-check everything |
| `pnpm test` | Run every workspace's unit tests |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create + apply a migration (interactive, dev only) |
| `pnpm db:deploy` | Apply committed migrations (non-interactive: CI, preview, deploy) |
| `pnpm db:seed` | Seed the dummy sender + sample document (idempotent) |

## Notes

- Animations use CSS `transition`/`animation` only — no `framer-motion`.
- AWS S3 / SES and KakaoTalk AlimTalk integrations fall back to console logging when their environment variables are unset; the stubs are filled in by follow-up grains.
