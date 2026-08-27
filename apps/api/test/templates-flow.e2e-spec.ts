/**
 * End-to-end CRUD for the reusable-template feature (grain-3):
 *   register → create → list → detail → rename → delete, all owner-scoped,
 *   plus ownership isolation and the per-plan template cap.
 */

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://hermes@localhost/esign_test?host=/var/run/postgresql&schema=public';
process.env.REDIS_URL = '';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

/** Smallest valid-ish PDF payload; enough to assert bytes stream back. */
const SAMPLE_PDF = Buffer.from('%PDF-1.4\n%stub template pdf\n%%EOF\n');

describe('Templates flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let token: string;
  let userId: string;

  const email = `tmpl_${Date.now()}@example.com`;
  const password = 'password1234';

  const sampleFields = [
    { type: 'SIGNATURE', page: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.08, recipientIndex: 0 },
    { type: 'DATE', page: 1, x: 0.5, y: 0.2, width: 0.2, height: 0.05, recipientIndex: 1 },
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name: 'Template Tester' })
      .expect(201);
    token = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await app.close();
  });

  it('blocks unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/templates').expect(401);
  });

  let templateId: string;

  it('creates a template with a saved field layout', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Standard Employment Agreement',
        storageKey: `templates/${userId}/std.pdf`,
        pageCount: 3,
        fields: sampleFields,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Standard Employment Agreement');
    expect(res.body.pageCount).toBe(3);
    expect(res.body.fieldCount).toBe(2);
    expect(res.body.fields).toHaveLength(2);
    expect(res.body.fields[0]).toMatchObject({ type: 'SIGNATURE', recipientIndex: 0 });
    templateId = res.body.id;
  });

  it('lists the owner templates (newest first, no field layout)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const found = res.body.find((t: { id: string }) => t.id === templateId);
    expect(found).toBeDefined();
    expect(found.fieldCount).toBe(2);
    expect(found.fields).toBeUndefined();
  });

  it('fetches a single template incl. its fields and storage key', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.storageKey).toBe(`templates/${userId}/std.pdf`);
    expect(res.body.fields).toHaveLength(2);
  });

  it('streams the original PDF bytes to the owner (200, application/pdf)', async () => {
    // Seed the object the template points at so the stream has bytes to serve.
    await storage.save(`templates/${userId}/std.pdf`, SAMPLE_PDF);

    const res = await request(app.getHttpServer())
      .get(`/api/templates/${templateId}/file`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBe(SAMPLE_PDF.length);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it("forbids streaming another owner's template PDF (403)", async () => {
    const other = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `filer_${Date.now()}@example.com`, password, name: 'File Intruder' })
      .expect(201);
    const otherToken = other.body.accessToken;
    const otherId = other.body.user.id;

    await request(app.getHttpServer())
      .get(`/api/templates/${templateId}/file`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await prisma.user.delete({ where: { id: otherId } }).catch(() => undefined);
  });

  it('renames a template', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Agreement' })
      .expect(200);
    expect(res.body.name).toBe('Updated Agreement');
  });

  it('returns a friendly 404 for a missing template', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/templates/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(res.body.message).toBe('The requested template could not be found.');
  });

  it("forbids access to another owner's template", async () => {
    const other = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `other_${Date.now()}@example.com`, password, name: 'Someone Else' })
      .expect(201);
    const otherToken = other.body.accessToken;
    const otherId = other.body.user.id;

    const res = await request(app.getHttpServer())
      .get(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect(res.body.message).toBe('You do not have permission to access this template.');

    await prisma.user.delete({ where: { id: otherId } }).catch(() => undefined);
  });

  it('enforces the Free-plan template cap with a friendly message', async () => {
    // The Free cap is 3; one template already exists, so seed two more to reach it.
    for (let i = 0; i < 2; i += 1) {
      await request(app.getHttpServer())
        .post('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Extra ${i}`, storageKey: `templates/${userId}/x${i}.pdf`, fields: [] })
        .expect(201);
    }
    const res = await request(app.getHttpServer())
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'One too many', storageKey: `templates/${userId}/over.pdf`, fields: [] })
      .expect(403);
    expect(res.body.message).toBe(
      'You have used all of your template slots. Delete an existing template or upgrade your plan.',
    );
  });

  it('deletes a template (204) and it disappears from the list', async () => {
    await request(app.getHttpServer())
      .delete(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
