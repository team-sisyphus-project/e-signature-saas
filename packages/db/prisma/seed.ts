/**
 * Seed entrypoint invoked by `pnpm --filter @repo/db db:seed` (repo root:
 * `pnpm db:seed`), and runnable directly with `ts-node prisma/seed.ts`.
 *
 * The seed logic itself lives in `src/seed.ts`; this file is only the process
 * wrapper — connect, run inside one transaction, disconnect, set an exit code.
 */
import { PrismaClient } from '@prisma/client';
import { resolveSeedConfig, seedDatabase } from '../src/seed';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set — point it at the target database before seeding.');
  }

  const config = resolveSeedConfig(process.env);
  const prisma = new PrismaClient();

  try {
    // One transaction so a partially applied seed can never be left behind.
    const summary = await prisma.$transaction((tx) => seedDatabase(tx, config));
    console.log(
      `Seed applied: sender ${summary.userEmail} (${summary.userId}), ` +
        `document ${summary.documentId}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Fail loudly and non-zero: a silently half-seeded database is worse than a
  // red release step.
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
