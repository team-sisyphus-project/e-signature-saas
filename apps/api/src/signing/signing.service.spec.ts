import { SigningService } from './signing.service';

/**
 * Contract coverage for the unauthenticated signing-link metadata endpoint.
 * The client renders its first screen from `meta.locale`, before it has a
 * signer session, so this must remain independent of authenticated-user state.
 */
describe('SigningService.meta locale contract', () => {
  function serviceFor(senderLocale: unknown) {
    const prisma = {
      signRequest: {
        findUnique: jest.fn().mockResolvedValue({
          recipientName: 'Alex Kim',
          status: 'PENDING',
          document: {
            title: 'Employment agreement',
            pageCount: 3,
            status: 'IN_PROGRESS',
            owner: {
              name: 'Sender',
              brandColor: null,
              brandLogoUrl: null,
              locale: senderLocale,
            },
          },
        }),
      },
    };

    return new SigningService(prisma as never, {} as never, {} as never, {} as never);
  }

  it('uses an English sender locale ahead of a Korean recipient browser', async () => {
    const meta = await serviceFor('en').meta('sign-token', 'ko-KR,ko;q=0.9');

    expect(meta.locale).toBe('en');
    expect(meta.sender.locale).toBe('en');
  });

  it('uses Accept-Language when a legacy sender record has no usable locale', async () => {
    const meta = await serviceFor(null).meta('sign-token', 'fr-FR, en-US;q=0.8');

    expect(meta.locale).toBe('en');
  });

  it('returns Korean when neither sender nor browser supplies a supported locale', async () => {
    const meta = await serviceFor(undefined).meta('sign-token', 'fr-FR,ja;q=0.8');

    expect(meta.locale).toBe('ko');
  });

  it('lets the link\u2019s ?lang= parameter override a Korean sender and Korean browser', async () => {
    const meta = await serviceFor('ko').meta('sign-token', 'ko-KR,ko;q=0.9', 'en');

    expect(meta.locale).toBe('en');
    // The sender's own preference is reported unchanged — only the screen locale moves.
    expect(meta.sender.locale).toBe('ko');
  });

  it('ignores an unsupported ?lang= value and keeps resolving from the sender', async () => {
    const meta = await serviceFor('en').meta('sign-token', 'ko-KR,ko;q=0.9', 'fr');

    expect(meta.locale).toBe('en');
  });

  it('falls back to Accept-Language when the link carries no parameter', async () => {
    const meta = await serviceFor(null).meta('sign-token', 'en-US,en;q=0.9', undefined);

    expect(meta.locale).toBe('en');
  });
});

describe('SigningService.complete locale handoff', () => {
  it('enqueues the sender locale as an explicit completion-output input', async () => {
    const completionQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const tx = {
      signRequest: {
        update: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(0),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
      document: { update: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      signRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'request_1',
          status: 'VIEWED',
          documentId: 'document_1',
          document: { status: 'IN_PROGRESS', owner: { locale: 'en' } },
          signFields: [{ id: 'field_1', value: 'Alex Kim' }],
        }),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => unknown) => callback(tx),
      ),
    };
    const service = new SigningService(
      prisma as never, {} as never, {} as never, completionQueue as never,
    );

    await expect(service.complete('request_1')).resolves.toMatchObject({
      documentCompleted: true,
    });
    expect(completionQueue.enqueue).toHaveBeenCalledWith('document_1', 'en');
  });
});

/**
 * A signer has no stored language preference, so the sender's locale names the
 * files they download — the same source that named the attachments already
 * sitting in their inbox.
 */
describe('SigningService.openArtifact filename locale', () => {
  function serviceFor(senderLocale: unknown) {
    const prisma = {
      signRequest: {
        findUnique: jest.fn().mockResolvedValue({
          document: {
            title: 'Employment Agreement',
            status: 'COMPLETED',
            signedStorageKey: 'documents/u1/completed/d1-signed.pdf',
            certificateStorageKey: 'documents/u1/completed/d1-certificate.pdf',
            owner: { locale: senderLocale },
          },
        }),
      },
    };
    const storage = { openStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }) };

    return new SigningService(prisma as never, storage as never, {} as never, {} as never);
  }

  it('names both artifacts in English for an English sender', async () => {
    const service = serviceFor('en');

    const signed = await service.openArtifact('sr_1', 'signed');
    const certificate = await service.openArtifact('sr_1', 'certificate');

    expect(signed.filename).toBe('Employment Agreement (Final Contract).pdf');
    expect(certificate.filename).toBe('Employment Agreement (Audit Trail Certificate).pdf');
    expect(`${signed.filename}${certificate.filename}`).not.toMatch(/[가-힣]/);
  });

  it('keeps Korean naming for a Korean sender', async () => {
    const { filename } = await serviceFor('ko').openArtifact('sr_1', 'signed');

    expect(filename).toBe('Employment Agreement (최종 계약서).pdf');
  });

  it('falls back to Korean when a legacy sender record has no usable locale', async () => {
    const { filename } = await serviceFor(null).openArtifact('sr_1', 'certificate');

    expect(filename).toBe('Employment Agreement (감사 추적 인증서).pdf');
  });
});
