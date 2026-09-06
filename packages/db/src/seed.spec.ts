import * as bcrypt from 'bcryptjs';
import {
  DEFAULT_SEED_USER_EMAIL,
  DEFAULT_SEED_USER_NAME,
  DEFAULT_SEED_USER_PASSWORD,
  SEED_DOCUMENT_ID,
  SEED_DOCUMENT_PAGE_COUNT,
  SEED_DOCUMENT_STORAGE_KEY,
  SEED_DOCUMENT_TITLE,
  resolveSeedConfig,
  seedDatabase,
  type SeedClient,
  type SeedConfig,
} from './seed';

/* -------------------------------------------------------------------------- */
/* In-memory stand-in for the Prisma client                                    */
/* -------------------------------------------------------------------------- */

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
}

interface DocumentRow {
  id: string;
  ownerId: string;
  title: string;
  storageKey: string;
  pageCount: number;
  status: string;
}

interface UpsertArgs<TWhere, TCreate, TUpdate> {
  where: TWhere;
  create: TCreate;
  update: TUpdate;
}

/**
 * Minimal upsert-semantics fake: find by the unique key in `where`, apply
 * `update` when present, otherwise insert `create`. Enough to prove the seed
 * converges without standing up PostgreSQL.
 */
class FakeDatabase {
  readonly users: UserRow[] = [];
  readonly documents: DocumentRow[] = [];
  /** Payloads passed to `document.upsert().update`, for field-level assertions. */
  readonly documentUpdatePayloads: Record<string, unknown>[] = [];

  private nextUserId = 1;

  readonly user = {
    upsert: async (
      args: UpsertArgs<{ email: string }, Partial<UserRow>, Partial<UserRow>>,
    ): Promise<{ id: string; email: string }> => {
      const existing = this.users.find((row) => row.email === args.where.email);
      if (existing) {
        Object.assign(existing, args.update);
        return { id: existing.id, email: existing.email };
      }
      const created: UserRow = {
        id: `user-${this.nextUserId++}`,
        email: args.where.email,
        name: null,
        passwordHash: null,
        ...args.create,
      };
      this.users.push(created);
      return { id: created.id, email: created.email };
    },
  };

  readonly document = {
    upsert: async (
      args: UpsertArgs<{ id: string }, Partial<DocumentRow>, Partial<DocumentRow>>,
    ): Promise<{ id: string }> => {
      this.documentUpdatePayloads.push({ ...args.update });
      const existing = this.documents.find((row) => row.id === args.where.id);
      if (existing) {
        Object.assign(existing, args.update);
        return { id: existing.id };
      }
      const created: DocumentRow = {
        id: args.where.id,
        ownerId: '',
        title: '',
        storageKey: '',
        pageCount: 0,
        status: 'DRAFT',
        ...args.create,
      };
      this.documents.push(created);
      return { id: created.id };
    },
  };

  /** The seed only needs `user`/`document`; the cast bridges the narrowed fake. */
  asSeedClient(): SeedClient {
    return this as unknown as SeedClient;
  }

  findUser(email: string): UserRow {
    const row = this.users.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`expected a seeded user for ${email}`);
    return row;
  }

  findDocument(id: string): DocumentRow {
    const row = this.documents.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`expected a seeded document with id ${id}`);
    return row;
  }
}

const defaultConfig = (): SeedConfig => resolveSeedConfig({});

describe('resolveSeedConfig', () => {
  it('falls back to the documented dummy credentials when nothing is set', () => {
    expect(resolveSeedConfig({})).toEqual({
      email: DEFAULT_SEED_USER_EMAIL,
      password: DEFAULT_SEED_USER_PASSWORD,
      name: DEFAULT_SEED_USER_NAME,
    });
  });

  it('treats blank and whitespace-only overrides as unset', () => {
    const config = resolveSeedConfig({
      SEED_USER_EMAIL: '',
      SEED_USER_PASSWORD: '   ',
      SEED_USER_NAME: '\t',
    });

    expect(config).toEqual({
      email: DEFAULT_SEED_USER_EMAIL,
      password: DEFAULT_SEED_USER_PASSWORD,
      name: DEFAULT_SEED_USER_NAME,
    });
  });

  it('honours environment overrides', () => {
    const config = resolveSeedConfig({
      SEED_USER_EMAIL: 'owner@acme.test',
      SEED_USER_PASSWORD: 'a-stronger-secret',
      SEED_USER_NAME: 'Acme Owner',
    });

    expect(config).toEqual({
      email: 'owner@acme.test',
      password: 'a-stronger-secret',
      name: 'Acme Owner',
    });
  });

  it('normalizes the email the way the API does on login', () => {
    // The API lowercases/trims on register and login, so a seeded mixed-case
    // address would otherwise be impossible to sign in with.
    expect(resolveSeedConfig({ SEED_USER_EMAIL: '  Demo@Example.COM  ' }).email).toBe(
      'demo@example.com',
    );
  });
});

describe('seedDatabase — green-field database', () => {
  it('creates exactly one sender and one sample document', async () => {
    const db = new FakeDatabase();

    const summary = await seedDatabase(db.asSeedClient(), defaultConfig());

    expect(db.users).toHaveLength(1);
    expect(db.documents).toHaveLength(1);
    expect(summary.userEmail).toBe(DEFAULT_SEED_USER_EMAIL);
    expect(summary.documentId).toBe(SEED_DOCUMENT_ID);
  });

  it('gives the sample document the seeded sender as owner', async () => {
    const db = new FakeDatabase();

    const summary = await seedDatabase(db.asSeedClient(), defaultConfig());
    const document = db.findDocument(SEED_DOCUMENT_ID);

    expect(document.ownerId).toBe(summary.userId);
    expect(document).toMatchObject({
      title: SEED_DOCUMENT_TITLE,
      storageKey: SEED_DOCUMENT_STORAGE_KEY,
      pageCount: SEED_DOCUMENT_PAGE_COUNT,
    });
  });

  it('stores the password as a bcrypt hash that verifies against the plaintext', async () => {
    const db = new FakeDatabase();
    const config = defaultConfig();

    await seedDatabase(db.asSeedClient(), config);
    const { passwordHash } = db.findUser(config.email);

    expect(passwordHash).toEqual(expect.any(String));
    expect(passwordHash).not.toBe(config.password);
    expect(await bcrypt.compare(config.password, passwordHash ?? '')).toBe(true);
  });

  it('never returns the plaintext password in its summary', async () => {
    const db = new FakeDatabase();
    const config = defaultConfig();

    const summary = await seedDatabase(db.asSeedClient(), config);

    expect(JSON.stringify(summary)).not.toContain(config.password);
  });
});

describe('seedDatabase — re-runs', () => {
  it('produces no duplicate rows when run twice in a row', async () => {
    const db = new FakeDatabase();
    const config = defaultConfig();

    const first = await seedDatabase(db.asSeedClient(), config);
    const second = await seedDatabase(db.asSeedClient(), config);

    expect(db.users).toHaveLength(1);
    expect(db.documents).toHaveLength(1);
    expect(second.userId).toBe(first.userId);
    expect(second.documentId).toBe(first.documentId);
  });

  it('keys the sample document on a stable id rather than a generated one', async () => {
    const db = new FakeDatabase();

    await seedDatabase(db.asSeedClient(), defaultConfig());
    await seedDatabase(db.asSeedClient(), defaultConfig());

    expect(db.documents.map((row) => row.id)).toEqual([SEED_DOCUMENT_ID]);
  });

  it('restores the documented credentials when the demo account has drifted', async () => {
    const db = new FakeDatabase();
    const config = defaultConfig();
    await seedDatabase(db.asSeedClient(), config);
    const user = db.findUser(config.email);
    user.passwordHash = await bcrypt.hash('changed-by-hand', 10);
    user.name = 'Renamed';

    await seedDatabase(db.asSeedClient(), config);

    const restored = db.findUser(config.email);
    expect(restored.name).toBe(config.name);
    expect(await bcrypt.compare(config.password, restored.passwordHash ?? '')).toBe(true);
  });

  it('leaves unrelated rows in a populated database untouched', async () => {
    const db = new FakeDatabase();
    db.users.push({
      id: 'real-user',
      email: 'someone@real.test',
      name: 'Real User',
      passwordHash: 'real-hash',
    });
    db.documents.push({
      id: 'real-document',
      ownerId: 'real-user',
      title: 'Real contract',
      storageKey: 'documents/real-user/real.pdf',
      pageCount: 4,
      status: 'IN_PROGRESS',
    });

    await seedDatabase(db.asSeedClient(), defaultConfig());

    expect(db.users).toHaveLength(2);
    expect(db.documents).toHaveLength(2);
    expect(db.findUser('someone@real.test')).toEqual({
      id: 'real-user',
      email: 'someone@real.test',
      name: 'Real User',
      passwordHash: 'real-hash',
    });
    expect(db.findDocument('real-document').status).toBe('IN_PROGRESS');
  });

  it('does not rewind the sample document lifecycle state on a re-run', async () => {
    const db = new FakeDatabase();
    const config = defaultConfig();
    await seedDatabase(db.asSeedClient(), config);
    db.findDocument(SEED_DOCUMENT_ID).status = 'IN_PROGRESS';

    await seedDatabase(db.asSeedClient(), config);

    expect(db.findDocument(SEED_DOCUMENT_ID).status).toBe('IN_PROGRESS');
    for (const payload of db.documentUpdatePayloads) {
      expect(payload).not.toHaveProperty('status');
    }
  });
});
