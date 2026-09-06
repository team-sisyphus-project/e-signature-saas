/**
 * Idempotent database seed.
 *
 * Establishes the minimum state a green-field database needs to be usable:
 * one dummy sender account with known credentials, and one sample document
 * owned by it. Every write is an upsert keyed on a stable identifier, so the
 * seed can be re-run any number of times — against an empty or an already
 * populated database — without creating duplicate rows.
 *
 * Idempotency keys:
 *   - the sender is keyed on `User.email` (unique)
 *   - the sample document is keyed on a fixed `Document.id` (see
 *     `SEED_DOCUMENT_ID`) rather than the generated cuid a normal upload gets
 *
 * Note: only database rows are seeded. The sample document's storage key is a
 * placeholder — no PDF bytes are written to object storage, because that layer
 * lives outside this package and resolves its root relative to the API's
 * working directory.
 */
import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

/** Matches the cost factor the API's auth service uses, so hashes are alike. */
const BCRYPT_ROUNDS = 10;

/** Credentials of the dummy sender when no environment override is supplied. */
export const DEFAULT_SEED_USER_EMAIL = 'demo@example.com';
export const DEFAULT_SEED_USER_PASSWORD = 'demo-password-123';
export const DEFAULT_SEED_USER_NAME = 'Demo Sender';

/**
 * Fixed primary key for the sample document. A generated cuid would make the
 * seed create a new row on every run; a constant makes the upsert converge.
 */
export const SEED_DOCUMENT_ID = 'seed-sample-document';
export const SEED_DOCUMENT_TITLE = 'Sample contract (seed data)';
export const SEED_DOCUMENT_STORAGE_KEY = `documents/seed/${SEED_DOCUMENT_ID}.pdf`;
export const SEED_DOCUMENT_PAGE_COUNT = 1;

/**
 * The slice of the Prisma client the seed touches. Narrowing it here keeps the
 * seed testable with an in-memory fake and lets it run either against the root
 * client or inside an interactive transaction.
 */
export type SeedClient = Pick<PrismaClient, 'user' | 'document'>;

/** Environment variables that can override the dummy sender's credentials. */
export interface SeedEnv {
  SEED_USER_EMAIL?: string;
  SEED_USER_PASSWORD?: string;
  SEED_USER_NAME?: string;
  [key: string]: string | undefined;
}

export interface SeedConfig {
  /** Normalized (trimmed + lowercased) login email. */
  email: string;
  /** Plaintext password; hashed before it ever reaches the database. */
  password: string;
  name: string;
}

export interface SeedSummary {
  userId: string;
  /** Echoed back for the CLI's success line. The password is never returned. */
  userEmail: string;
  documentId: string;
}

/** Treat unset and whitespace-only environment values alike: use the default. */
function envValue(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Resolve the dummy sender's credentials from the environment.
 *
 * The email is lowercased to match how the API normalizes it on register and
 * login — a seeded `Demo@Example.com` would otherwise be unreachable.
 */
export function resolveSeedConfig(env: SeedEnv = {}): SeedConfig {
  return {
    email: envValue(env.SEED_USER_EMAIL, DEFAULT_SEED_USER_EMAIL).toLowerCase(),
    password: envValue(env.SEED_USER_PASSWORD, DEFAULT_SEED_USER_PASSWORD),
    name: envValue(env.SEED_USER_NAME, DEFAULT_SEED_USER_NAME),
  };
}

/**
 * Apply the seed. Safe to call repeatedly.
 *
 * The sender's name and password hash are re-asserted on every run so the
 * documented credentials always work. The sample document's content fields are
 * re-asserted too, but its lifecycle state (status, timestamps) is left alone
 * so a re-run does not rewind a document someone has been working with.
 */
export async function seedDatabase(client: SeedClient, config: SeedConfig): Promise<SeedSummary> {
  const passwordHash = await bcrypt.hash(config.password, BCRYPT_ROUNDS);

  const user = await client.user.upsert({
    where: { email: config.email },
    create: { email: config.email, name: config.name, passwordHash },
    update: { name: config.name, passwordHash },
    select: { id: true, email: true },
  });

  const documentFields = {
    ownerId: user.id,
    title: SEED_DOCUMENT_TITLE,
    storageKey: SEED_DOCUMENT_STORAGE_KEY,
    pageCount: SEED_DOCUMENT_PAGE_COUNT,
  };

  const document = await client.document.upsert({
    where: { id: SEED_DOCUMENT_ID },
    create: { id: SEED_DOCUMENT_ID, ...documentFields },
    update: documentFields,
    select: { id: true },
  });

  return { userId: user.id, userEmail: user.email, documentId: document.id };
}
