import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HTTP-level checks over the real Nest pipeline for the theme preference save
 * endpoint (routing, ValidationPipe allowlist, the Prisma update wiring). The
 * guard is stubbed to inject a fixed principal; the service is unused here.
 */
describe('AuthController — POST /auth/theme', () => {
  let app: INestApplication;
  const prisma = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
          ctx.switchToHttp().getRequest().user = { id: 'user_1', email: 'a@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.user.update.mockReset();
  });

  it('persists the selected theme and returns the updated user', async () => {
    prisma.user.update.mockResolvedValue({
      id: 'user_1',
      email: 'a@example.com',
      name: null,
      plan: 'FREE',
      locale: 'ko',
      themePreference: 'dark',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/theme')
      .send({ theme: 'dark' })
      .expect(201);

    expect(res.body.themePreference).toBe('dark');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { themePreference: 'dark' },
      select: { id: true, email: true, name: true, plan: true, locale: true, themePreference: true },
    });
  });

  it('accepts every allowed value', async () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      prisma.user.update.mockResolvedValue({ id: 'user_1', themePreference: theme });
      const res = await request(app.getHttpServer())
        .post('/auth/theme')
        .send({ theme })
        .expect(201);
      expect(res.body.themePreference).toBe(theme);
    }
  });

  it('rejects an unknown theme value with 400 and never touches the DB', async () => {
    await request(app.getHttpServer())
      .post('/auth/theme')
      .send({ theme: 'neon' })
      .expect(400);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
