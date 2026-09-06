# @repo/db

Prisma schema and PostgreSQL client for the platform.

## Usage

```ts
import { prisma } from '@repo/db';

const users = await prisma.user.findMany();
```

## Commands

Run from the repo root or this package:

```bash
pnpm --filter @repo/db db:generate   # generate the Prisma client
pnpm --filter @repo/db db:migrate    # create + apply a dev migration (interactive)
pnpm --filter @repo/db db:deploy     # apply committed migrations (non-interactive)
pnpm --filter @repo/db db:seed       # seed the dummy sender + sample document
pnpm --filter @repo/db db:push       # push schema without a migration
pnpm --filter @repo/db db:studio     # open Prisma Studio
pnpm --filter @repo/db test          # unit tests (no database required)
```

`DATABASE_URL` must be set (see the repo-root `.env.example`). These commands do
not load `.env` themselves — export the variable, or let the platform inject it.

## Seed

`db:deploy` followed by `db:seed` takes a green-field database to a usable
state. Both are idempotent, so re-running them changes nothing.

The seed lives in two pieces:

- `src/seed.ts` — `resolveSeedConfig()` reads the `SEED_USER_*` overrides and
  `seedDatabase()` applies the upserts. It takes a narrowed `SeedClient`
  (`Pick<PrismaClient, 'user' | 'document'>`), so it runs against either the
  root client or a transaction, and unit-tests against an in-memory fake.
- `prisma/seed.ts` — the process wrapper: connect, run inside one transaction,
  disconnect, exit non-zero on failure.

Idempotency comes from upserting on stable keys: `User.email` for the sender and
a fixed `Document.id` (`SEED_DOCUMENT_ID`) for the sample, rather than the cuid a
normal upload would generate. See the repo-root README for the dummy account
credentials and their environment overrides.
