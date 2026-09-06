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
- Docker (for local Postgres/Redis, optional)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Prepare environment variables
cp .env.example .env

# 3. Start local infrastructure (Postgres + Redis)
docker compose up -d

# 4. Generate the Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# 5. Seed the dummy sender account and sample document
pnpm db:seed

# 6. Start the dev servers concurrently (web + api)
pnpm dev
```

- web: http://localhost:3000
- api: http://localhost:3001 (health: http://localhost:3001/health)

In this two-server dev setup the browser must be told where the API lives, so
set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env` before `pnpm dev`.
Leave it **unset** for the single-port build (`pnpm build && pnpm start`), where
the API also serves the web app: the client then calls `/api/...` on the same
origin as the page.

## Production / preview run (single port)

One process, one port, plain HTTP — TLS is terminated upstream, so nothing here
redirects to https. The API owns `$PORT` and serves the built web app on every
path it does not own itself (`/api/*` and `/health` stay with the API).

```bash
pnpm install
pnpm build                 # prisma generate → nest build (api) → next build (web)

export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/esign?schema=public'
export REDIS_URL='redis://localhost:6379'
PORT=8080 pnpm start       # migrate deploy → seed → node apps/api/dist/main.js
```

- `PORT` is read from the environment; it falls back to `API_PORT`, then `3001`.
  No port is hardcoded.
- `pnpm start` applies migrations and runs the seed before it boots, so a
  green-field database is ready by the time the server listens. Both steps are
  idempotent, so a restart against an existing database is a no-op that keeps
  the dummy account's documented credentials in place.
- Every setting is an environment variable (see `.env.example`); nothing is
  read from a committed config file and no secret has a production default.
- Leave `NEXT_PUBLIC_API_URL` unset for this mode — the browser then calls the
  API on the same origin as the page.

Verify a running instance:

```bash
curl -i http://localhost:8080/          # 200, the web app's entry screen
curl -s http://localhost:8080/health    # {"status":"ok",...}
```

The platform's preview reads the same two commands from `preview.toml`
(`model = "server"`, build `pnpm build`, serve `pnpm start`, `port_env = "PORT"`),
which exists because auto-detection cannot infer a monorepo whose runtime
entrypoint is the API process rather than either workspace on its own.

## Green-field database setup

Both commands read `DATABASE_URL` from the environment (they do **not** load
`.env` themselves), so export it first — or let the platform inject it:

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/esign?schema=public'

pnpm db:deploy   # apply every file-based migration in packages/db/prisma/migrations
pnpm db:seed     # create the dummy sender + sample document
```

Use `pnpm db:deploy` (not `db:migrate`) anywhere non-interactive — a preview
release step, CI, a deployment. It applies the committed migration files and
never prompts or generates new ones.

Both steps are idempotent: running them against an empty database, or twice in a
row, ends in the same state with no duplicate rows. The seed upserts on stable
keys — the sender on its email, the sample document on a fixed id — and it
re-asserts the documented credentials on every run, so a drifted demo password is
restored rather than duplicated. Unrelated rows are never touched, and the sample
document's status/timestamps are left as-is once it exists.

### Dummy account

| Field | Default | Override |
|---|---|---|
| Email | `demo@example.com` | `SEED_USER_EMAIL` |
| Password | `demo-password-123` | `SEED_USER_PASSWORD` |
| Name | `Demo Sender` | `SEED_USER_NAME` |

These defaults are for local and preview environments only. Set
`SEED_USER_PASSWORD` to a strong value in any shared environment — the seed
hashes it with bcrypt and never logs or stores the plaintext.

The seed also creates one sample document (`Sample contract (seed data)`, status
`DRAFT`) owned by that account. Only the database row is seeded — no PDF bytes
are written to object storage — so the sample shows up in the document list but
has no file behind it. Upload a real PDF to exercise the full signing flow.

## Key scripts (repo root)

| Command | Description |
|---|---|
| `pnpm dev` | Run web/api concurrently via turbo |
| `pnpm build` | Generate the Prisma client, then build the api + web workspaces |
| `pnpm start` | Migrate, seed, and run the built app on `$PORT` (single port) |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Type-check everything |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create + apply a migration (interactive, dev only) |
| `pnpm db:deploy` | Apply committed migrations (non-interactive: CI, preview, deploy) |
| `pnpm db:seed` | Seed the dummy sender + sample document (idempotent) |

## Notes

- Animations use CSS `transition`/`animation` only — no `framer-motion`.
- AWS S3 / SES and KakaoTalk AlimTalk integrations fall back to console logging when their environment variables are unset; the stubs are filled in by follow-up grains.
