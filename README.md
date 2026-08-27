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

- Node.js >= 20
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

# 5. Start the dev servers concurrently (web + api)
pnpm dev
```

- web: http://localhost:3000
- api: http://localhost:3001 (health: http://localhost:3001/health)

## Key scripts (repo root)

| Command | Description |
|---|---|
| `pnpm dev` | Run web/api concurrently via turbo |
| `pnpm build` | Build everything |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Type-check everything |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Run Prisma migrations (dev) |

## Notes

- Animations use CSS `transition`/`animation` only — no `framer-motion`.
- AWS S3 / SES and KakaoTalk AlimTalk integrations fall back to console logging when their environment variables are unset; the stubs are filled in by follow-up grains.
