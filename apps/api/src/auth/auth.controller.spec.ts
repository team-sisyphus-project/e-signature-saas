import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/current-user.decorator';

/**
 * The language setting is only "persistent" if the API boundary holds: the
 * write must land on the caller's own row as a closed `ko|en` value, and the
 * session read must hand that value back. These cases exercise the real Nest
 * pipeline (routing, guard, ValidationPipe with the same options `main.ts`
 * installs) against an in-memory Prisma double — no live database.
 *
 * The web client persists the `POST /auth/locale` response verbatim as its
 * session user, so the response *shape* is part of the contract, not an
 * incidental detail.
 */

/** Principal the guard puts on the request, standing in for a verified JWT. */
const CALLER: AuthUser = { id: 'user_1', email: 'sender@toss.im' };

/** Sentinel for a column these routes must never select. */
const SECRET = 'hash-that-must-not-travel';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  locale: 'ko' | 'en';
  brandColor: string | null;
  brandLogoUrl: string | null;
  passwordHash: string;
};

function seedRows(): Map<string, UserRow> {
  return new Map<string, UserRow>([
    [
      'user_1',
      {
        id: 'user_1',
        email: 'sender@toss.im',
        name: '토스',
        plan: 'FREE',
        locale: 'ko',
        brandColor: '#163AF2',
        brandLogoUrl: null,
        passwordHash: SECRET,
      },
    ],
    [
      'user_2',
      {
        id: 'user_2',
        email: 'other@toss.im',
        name: 'Someone Else',
        plan: 'PRO',
        locale: 'en',
        brandColor: null,
        brandLogoUrl: null,
        passwordHash: SECRET,
      },
    ],
  ]);
}

/** Mirror Prisma's `select` projection so "which columns were asked for" is observable. */
function project(row: UserRow, select?: Record<string, boolean>): Record<string, unknown> {
  if (!select) return { ...row };
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, wanted]) => wanted)
      .map(([key]) => [key, row[key as keyof UserRow]]),
  );
}

describe('AuthController — locale persistence (HTTP)', () => {
  let app: INestApplication;
  let rows: Map<string, UserRow>;
  let findUnique: jest.Mock;
  let update: jest.Mock;

  beforeEach(async () => {
    rows = seedRows();
    findUnique = jest.fn(
      async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
        const row = rows.get(where.id);
        return row ? project(row, select) : null;
      },
    );
    update = jest.fn(
      async ({
        where,
        data,
        select,
      }: {
        where: { id: string };
        data: Partial<UserRow>;
        select?: Record<string, boolean>;
      }) => {
        const row = rows.get(where.id);
        if (!row) throw new Error(`no such user: ${where.id}`);
        Object.assign(row, data);
        return project(row, select);
      },
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { register: jest.fn(), login: jest.fn(), loginWithGoogle: jest.fn() },
        },
        { provide: PrismaService, useValue: { user: { findUnique, update } } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      // Stand in for a verified JWT: attach the principal `@CurrentUser` reads.
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: AuthUser } };
        }) => {
          ctx.switchToHttp().getRequest().user = CALLER;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    // Same options as `main.ts` — validation behaviour is what is under test.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/auth/locale', () => {
    it('writes the chosen locale to the caller row and returns the updated session user', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'en' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 'user_1',
        email: 'sender@toss.im',
        name: '토스',
        plan: 'FREE',
        locale: 'en',
      });
      // The stored row moved, not just the response.
      expect(rows.get('user_1')!.locale).toBe('en');
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user_1' }, data: { locale: 'en' } }),
      );
    });

    it('switches back to Korean, so the choice is not one-way', async () => {
      await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'en' });
      const res = await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'ko' });

      expect(res.status).toBe(201);
      expect(res.body.locale).toBe('ko');
      expect(rows.get('user_1')!.locale).toBe('ko');
    });

    it('targets the authenticated principal, ignoring an id/email supplied in the body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/locale')
        .send({ locale: 'en', id: 'user_2', email: 'other@toss.im' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('user_1');
      expect(update).toHaveBeenCalledTimes(1);
      // A body field cannot redirect the write to someone else's row.
      expect(update.mock.calls[0][0].where).toEqual({ id: 'user_1' });
      expect(update.mock.calls[0][0].data).toEqual({ locale: 'en' });
    });

    it('returns exactly the session fields the client persists, and no credential material', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'en' });

      expect(Object.keys(res.body).sort()).toEqual(['email', 'id', 'locale', 'name', 'plan']);
      expect(JSON.stringify(res.body)).not.toContain(SECRET);
    });

    it('is not reachable without a valid session', async () => {
      const locked = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: {} },
          { provide: PrismaService, useValue: { user: { findUnique, update } } },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const lockedApp = locked.createNestApplication();
      lockedApp.setGlobalPrefix('api', { exclude: ['health'] });
      await lockedApp.init();

      try {
        const res = await request(lockedApp.getHttpServer())
          .post('/api/auth/locale')
          .send({ locale: 'en' });

        expect(res.status).toBe(403);
        expect(update).not.toHaveBeenCalled();
      } finally {
        await lockedApp.close();
      }
    });
  });

  describe('UpdateLocaleDto — the locale column only ever takes ko or en', () => {
    // Every one of these would corrupt the stored preference (or the resource
    // lookups keyed off it) if it reached Prisma.
    const rejected: Array<[string, unknown]> = [
      ['an unsupported language', { locale: 'ja' }],
      ['a region-tagged value', { locale: 'en-US' }],
      ['the wrong case', { locale: 'KO' }],
      ['an empty string', { locale: '' }],
      ['a missing field', {}],
      ['an explicit null', { locale: null }],
      ['a non-string', { locale: 1 }],
      ['an array of valid values', { locale: ['ko', 'en'] }],
    ];

    it.each(rejected)('rejects %s with 400 and no write', async (_label, body) => {
      const res = await request(app.getHttpServer()).post('/api/auth/locale').send(body as object);

      expect(res.status).toBe(400);
      expect(update).not.toHaveBeenCalled();
      expect(rows.get('user_1')!.locale).toBe('ko');
    });

    it('names the offending field so the client can surface a usable error', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'ja' });

      expect(JSON.stringify(res.body.message)).toContain('locale');
    });

    it('accepts both published locales', async () => {
      for (const locale of ['ko', 'en'] as const) {
        const res = await request(app.getHttpServer()).post('/api/auth/locale').send({ locale });
        expect(res.status).toBe(201);
        expect(res.body.locale).toBe(locale);
      }
    });
  });

  describe('GET /api/auth/me', () => {
    it('exposes the stored locale for the authenticated user', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.locale).toBe('ko');
      expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user_1' } }));
    });

    it('hands back the value a previous POST persisted — the setting survives a reconnect', async () => {
      await request(app.getHttpServer()).post('/api/auth/locale').send({ locale: 'en' });

      // A fresh session read is all the reconnected client has to go on.
      const res = await request(app.getHttpServer()).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.locale).toBe('en');
    });

    it('projects the principal row without leaking credential material', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');

      expect(Object.keys(res.body).sort()).toEqual([
        'brandColor',
        'brandLogoUrl',
        'email',
        'id',
        'locale',
        'name',
        'plan',
      ]);
      expect(JSON.stringify(res.body)).not.toContain(SECRET);
    });
  });
});
