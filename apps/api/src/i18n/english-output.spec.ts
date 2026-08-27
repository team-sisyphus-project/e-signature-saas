/* ────────────────────────────────────────────────────────────────────────────
 * "No Korean reaches an English recipient" — the executable form of M-4/M-5.
 *
 * The other suites assert copy through the seams the code offers: the row
 * builders, the rendered email object. Those seams are the right place to check
 * wording, but they cannot answer the question the milestone actually asks —
 * *what did the reader see*. A label can be resolved correctly and still be
 * drawn from a second, forgotten call site; a string can be English in the
 * catalog and Korean on the page.
 *
 * So this suite reads the outputs the way the recipient does:
 *   • the certificate — by spying on every `PDFPage.drawText` call, i.e. every
 *     glyph run the PDF actually carries, not the copy we intended to draw;
 *   • the email — by sweeping every rendered field (subject, html, text) and
 *     every attachment filename;
 *   • both together — through one real `CompletionService` run with an English
 *     sender locale, which is the only path a production recipient travels.
 *
 * Every fixture here is deliberately English *user data* (titles, names). User
 * data is never translated (it is the sender's own words), so Korean user data
 * would trip the sweep for a reason that is not a defect. The bar under test is
 * authored copy: everything the product, not the sender, put on the page.
 * ──────────────────────────────────────────────────────────────────────────── */

import { PDFDocument, PDFPage } from 'pdf-lib';
import { artifactFilename } from '../completion/artifact';
import { CompletionService } from '../completion/completion.service';
import {
  renderCompletionEmail,
  type CompletionEmailInput,
} from '../email/completion-email.template';
import type { EmailMessage, EmailService } from '../email/email.service';
import {
  AuditCertificateService,
  type AuditCertificateInput,
} from '../pdf/audit-certificate.service';
import { SignedPdfService } from '../pdf/signed-pdf.service';
import { SERVER_TRANSLATIONS } from './server-translations';

/** Hangul syllables — the shape a reverted label takes. */
const HANGUL = /[가-힣]/;

/** Jamo-inclusive sweep: catches half-typed Hangul (`ㄱ`, `ㅏ`) as well. */
const ANY_KOREAN = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-퟿]/;

const SHA_ORIGINAL = 'a'.repeat(64);
const SHA_FINAL = 'b'.repeat(64);

/**
 * Record every string the PDF pipeline actually draws while `run` executes.
 *
 * `drawText` is the single glyph-emitting API of pdf-lib, so spying on the
 * prototype captures the page's whole text layer regardless of which service,
 * font, or code path produced it. The spy calls through, so the PDF under test
 * is the real one.
 */
async function captureDrawnText<T>(
  run: () => Promise<T>,
): Promise<{ result: T; drawn: string[] }> {
  const spy = jest.spyOn(PDFPage.prototype, 'drawText');
  try {
    const result = await run();
    return { result, drawn: spy.mock.calls.map((call) => String(call[0])) };
  } finally {
    spy.mockRestore();
  }
}

/** Values holding a placeholder are templates; their rendered form is asserted directly. */
function staticCopy(scope: Readonly<Record<string, string>>): string[] {
  return Object.values(scope).filter((value) => !value.includes('{'));
}

/* ──────────────────────── audit certificate (M-5) ──────────────────────── */

/** A complete English certificate input — every section populated. */
function englishCertificate(
  overrides: Partial<AuditCertificateInput> = {},
): AuditCertificateInput {
  return {
    locale: 'en',
    document: {
      id: 'doc_abc123',
      title: 'Service Agreement',
      pageCount: 3,
      sentAt: '2026-06-20T01:00:00.000Z',
      completedAt: '2026-06-23T08:30:45.000Z',
    },
    sender: { name: 'Toss Corporation', email: 'sender@toss.im', brandColor: null },
    participants: [
      { name: 'Jane Doe', email: 'jane@example.com', order: 1, signedAt: '2026-06-22T05:10:00.000Z' },
      { name: 'John Roe', email: 'john@sample.io', order: 2, signedAt: '2026-06-23T08:30:00.000Z' },
    ],
    // One event per mapped action code, so every timeline label is drawn.
    events: [
      { action: 'DOCUMENT_UPLOADED', occurredAt: '2026-06-19T23:00:00.000Z', actorName: 'Toss Corporation', actorRole: 'SENDER', ipAddress: '203.0.113.7' },
      { action: 'CONTRACT_SENT', occurredAt: '2026-06-20T01:00:00.000Z', actorName: 'Toss Corporation', actorRole: 'SENDER', ipAddress: '203.0.113.7' },
      { action: 'SIGN_REQUEST_VIEWED', occurredAt: '2026-06-22T05:00:00.000Z', actorName: 'Jane Doe', actorRole: 'SIGNER', ipAddress: '198.51.100.23' },
      { action: 'SIGN_REQUEST_VERIFIED', occurredAt: '2026-06-22T05:03:00.000Z', actorName: 'Jane Doe', actorRole: 'SIGNER', ipAddress: '198.51.100.23' },
      { action: 'SIGN_VERIFY_FAILED', occurredAt: '2026-06-22T05:04:00.000Z', actorName: 'Jane Doe', actorRole: 'SIGNER', ipAddress: '198.51.100.23' },
      { action: 'SIGN_REQUEST_SIGNED', occurredAt: '2026-06-22T05:10:00.000Z', actorName: 'Jane Doe', actorRole: 'SIGNER', ipAddress: '198.51.100.23' },
      { action: 'DOCUMENT_COMPLETED', occurredAt: '2026-06-23T08:30:45.000Z', actorRole: 'SYSTEM' },
    ],
    originalPdfSha256: SHA_ORIGINAL,
    finalPdfSha256: SHA_FINAL,
    issuedAt: '2026-06-23T08:30:45.000Z',
    certificateId: 'CERT-20260623-0001',
    serviceName: 'eContract',
    ...overrides,
  };
}

/** The degraded shapes: no sender name, no signers, an unmapped action code. */
function englishCertificateWithGaps(): AuditCertificateInput {
  return englishCertificate({
    sender: { name: null, email: 'sender@toss.im', brandColor: null },
    participants: [],
    events: [{ action: 'FUTURE_UNKNOWN_ACTION', occurredAt: '2026-06-23T00:00:00.000Z' }],
  });
}

/** A signer who never signed — the only path that draws the "not signed" copy. */
function englishCertificateUnsigned(): AuditCertificateInput {
  return englishCertificate({
    participants: [{ name: 'Jane Doe', email: 'jane@example.com', order: 1, signedAt: null }],
  });
}

describe('English audit certificate (M-5)', () => {
  const service = new AuditCertificateService();

  /** Drawn text of all three inputs — the union of every reachable label. */
  async function drawAllVariants(): Promise<string[]> {
    const inputs = [
      englishCertificate(),
      englishCertificateWithGaps(),
      englishCertificateUnsigned(),
    ];
    const drawn: string[] = [];
    for (const input of inputs) {
      const captured = await captureDrawnText(() => service.generate(input));
      drawn.push(...captured.drawn);
    }
    return drawn;
  }

  it('draws no Korean anywhere on the page', async () => {
    const { drawn } = await captureDrawnText(() => service.generate(englishCertificate()));

    // Guards the sweep itself: an assertion over an empty list passes happily,
    // which would make this file lie the day `drawText` stops being the draw API.
    expect(drawn.length).toBeGreaterThan(40);
    for (const text of drawn) {
      expect(text).not.toMatch(ANY_KOREAN);
    }
  });

  it('draws no Korean when the sender, signers, or action code are missing', async () => {
    // Fallback copy (`Sender`, `There are no registered signers.`, `Other
    // activity`) is drawn only on these paths, so a Korean fallback survives a
    // happy-path-only sweep.
    for (const input of [englishCertificateWithGaps(), englishCertificateUnsigned()]) {
      const { drawn } = await captureDrawnText(() => service.generate(input));
      for (const text of drawn) {
        expect(text).not.toMatch(ANY_KOREAN);
      }
    }
  });

  it('draws every English label the certificate catalog defines', async () => {
    const page = (await drawAllVariants()).join('\n');

    // Why this sits beside the sweep: the sweep proves nothing Korean is drawn,
    // this proves the English copy is what got drawn instead. Without it, a
    // label that stopped being drawn at all would still pass the sweep.
    for (const copy of staticCopy(SERVER_TRANSLATIONS.en.auditCertificate)) {
      expect(page).toContain(copy);
    }
    // The one templated value, in its rendered form.
    expect(page).toContain('3 pages');
  });

  it('titles the PDF metadata in English', async () => {
    // Not drawn text, but the reader sees it: it is the viewer's window title.
    const pdf = await service.generate(englishCertificate());
    const doc = await PDFDocument.load(pdf);

    expect(doc.getTitle()).toBe('Audit Trail Certificate');
    expect(doc.getTitle()).not.toMatch(ANY_KOREAN);
  });
});

/* ────────────────────────── completion email (M-4) ────────────────────────── */

const ENGLISH_EMAIL_BASE = {
  locale: 'en',
  contractTitle: 'Employment Agreement',
  senderName: 'Toss Corporation',
} as const;

/** Every rendering branch the template owns, for one English recipient each. */
const ENGLISH_EMAIL_VARIANTS: Array<{ name: string; input: CompletionEmailInput }> = [
  {
    name: 'signer',
    input: { ...ENGLISH_EMAIL_BASE, recipientRole: 'SIGNER' },
  },
  {
    name: 'sender with dashboard CTA',
    input: {
      ...ENGLISH_EMAIL_BASE,
      recipientRole: 'SENDER',
      dashboardUrl: 'https://app.esign.kr/dashboard',
      brandColor: '#e94560',
    },
  },
  {
    name: 'sender without a dashboard URL',
    input: { ...ENGLISH_EMAIL_BASE, recipientRole: 'SENDER' },
  },
  {
    // Blank sender name → the `Sender` fallback; a logo URL → the alt text.
    name: 'unnamed sender with a brand logo',
    input: {
      ...ENGLISH_EMAIL_BASE,
      senderName: '   ',
      recipientRole: 'SIGNER',
      brandLogoUrl: 'https://cdn.esign.kr/logo.png',
    },
  },
];

describe('English completion email (M-4)', () => {
  it.each(ENGLISH_EMAIL_VARIANTS)(
    'renders no Korean in any field for the $name variant',
    ({ input }) => {
      const rendered = renderCompletionEmail(input);

      for (const field of [rendered.subject, rendered.html, rendered.text]) {
        expect(field.length).toBeGreaterThan(0);
        expect(field).not.toMatch(ANY_KOREAN);
      }
    },
  );

  it('renders every English email string the catalog defines', () => {
    const rendered = ENGLISH_EMAIL_VARIANTS.map(({ input }) => renderCompletionEmail(input));
    const body = rendered.map((r) => `${r.subject}\n${r.html}\n${r.text}`).join('\n');

    for (const copy of staticCopy(SERVER_TRANSLATIONS.en.completionEmail)) {
      expect(body).toContain(copy);
    }
    // The two templated values, in their rendered form.
    expect(body).toContain('[Employment Agreement] Contract completed');
    expect(body).toContain('All signatures for Employment Agreement are complete.');
  });

  it('names both attachments in English, including the untitled fallback', () => {
    const named = [
      artifactFilename('Employment Agreement', 'signed', 'en'),
      artifactFilename('Employment Agreement', 'certificate', 'en'),
      artifactFilename('   ', 'signed', 'en'),
    ];

    expect(named).toEqual([
      'Employment Agreement (Final Contract).pdf',
      'Employment Agreement (Audit Trail Certificate).pdf',
      'Contract (Final Contract).pdf',
    ]);
    for (const filename of named) {
      expect(filename).not.toMatch(ANY_KOREAN);
    }
  });
});

/* ──────────────── the whole pipeline, one English send (M-4 + M-5) ──────────────── */

/** A tiny but valid 1×1 PNG, used as the captured signature value. */
const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function makePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([600, 800]);
  return Buffer.from(await doc.save());
}

/** An English sender's completed contract, ready for post-processing. */
function englishDocument() {
  return {
    id: 'doc_xyz789',
    ownerId: 'user_1',
    title: 'Employment Agreement',
    pageCount: 1,
    storageKey: 'documents/user_1/original.pdf',
    status: 'COMPLETED',
    sentAt: new Date('2026-06-20T01:00:00.000Z'),
    completedAt: null as Date | null,
    owner: { name: 'Toss Corporation', email: 'sender@toss.im', brandColor: null, brandLogoUrl: null },
    signRequests: [
      {
        id: 'sr_1',
        recipientEmail: 'signer@example.com',
        recipientName: 'Jane Doe',
        order: 0,
        signedAt: new Date('2026-06-23T08:30:00.000Z'),
        signFields: [
          { type: 'SIGNATURE', page: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.08, value: PNG_1x1 },
        ],
      },
    ],
    auditLogs: [
      { action: 'DOCUMENT_UPLOADED', createdAt: new Date('2026-06-19T23:00:00.000Z'), signRequestId: null, actorId: 'user_1', ipAddress: '203.0.113.7' },
      { action: 'CONTRACT_SENT', createdAt: new Date('2026-06-20T01:00:00.000Z'), signRequestId: null, actorId: 'user_1', ipAddress: '203.0.113.7' },
      { action: 'SIGN_REQUEST_SIGNED', createdAt: new Date('2026-06-23T08:30:00.000Z'), signRequestId: 'sr_1', actorId: null, ipAddress: '198.51.100.23' },
      { action: 'DOCUMENT_COMPLETED', createdAt: new Date('2026-06-23T08:30:05.000Z'), signRequestId: null, actorId: null, ipAddress: null },
    ],
  };
}

/** Real PDF/email services; only the DB, object storage and SES are stubbed. */
async function makeEnglishHarness() {
  const storage = new Map<string, Buffer>([['documents/user_1/original.pdf', await makePdf()]]);
  const emails: EmailMessage[] = [];
  const doc = englishDocument();

  const prisma = {
    document: {
      findUnique: jest.fn(async () => doc),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  const storageService = {
    read: jest.fn(async (key: string) => {
      const bytes = storage.get(key);
      if (!bytes) throw new Error(`missing key ${key}`);
      return bytes;
    }),
    save: jest.fn(async (key: string, data: Buffer) => {
      storage.set(key, data);
    }),
  };
  const email: Pick<EmailService, 'sendEach'> = {
    sendEach: jest.fn(async (messages: EmailMessage[]) => {
      emails.push(...messages);
      return messages.map((m) => ({
        delivered: false as const,
        channel: 'console' as const,
        recipients: m.to.map((t) => t.email),
      }));
    }),
  };
  const config = { get: jest.fn(() => 'https://app.esign.kr') };

  const service = new CompletionService(
    prisma as never,
    storageService as never,
    new SignedPdfService(),
    new AuditCertificateService(),
    email as never,
    config as never,
  );

  return { service, storage, emails };
}

describe('CompletionService with an English sender locale', () => {
  it('puts no Korean in any email field or attachment name it sends', async () => {
    const h = await makeEnglishHarness();

    await h.service.runPostProcessing('doc_xyz789', 'en');

    expect(h.emails).toHaveLength(2);
    for (const message of h.emails) {
      for (const field of [message.subject, message.html, message.text ?? '']) {
        expect(field).not.toMatch(ANY_KOREAN);
      }
      expect(message.attachments!.map((a) => a.filename)).toEqual([
        'Employment Agreement (Final Contract).pdf',
        'Employment Agreement (Audit Trail Certificate).pdf',
      ]);
      for (const attachment of message.attachments!) {
        expect(attachment.filename).not.toMatch(ANY_KOREAN);
      }
    }
  });

  it('draws no Korean into the certificate it attaches and stores', async () => {
    const h = await makeEnglishHarness();

    // The sweep covers both PDFs the run produces — the composed final contract
    // and the certificate — because both draw through the same page API.
    const { drawn } = await captureDrawnText(() => h.service.runPostProcessing('doc_xyz789', 'en'));

    expect(drawn.length).toBeGreaterThan(40);
    for (const text of drawn) {
      expect(text).not.toMatch(ANY_KOREAN);
    }

    const stored = h.storage.get('documents/user_1/completed/doc_xyz789-certificate.pdf');
    expect(stored).toBeDefined();
    const certificate = await PDFDocument.load(stored!);
    expect(certificate.getTitle()).toBe('Audit Trail Certificate');

    // The attached copy is the stored copy — one artifact, not two renderings.
    const attached = h.emails[0].attachments!.find((a) => a.filename.includes('Audit Trail'));
    expect(attached!.content.equals(stored!)).toBe(true);
  });

  it('draws the certificate labels a reader needs, in English', async () => {
    const h = await makeEnglishHarness();

    const { drawn } = await captureDrawnText(() => h.service.runPostProcessing('doc_xyz789', 'en'));
    const page = drawn.join('\n');

    // A representative row from each section — proof the sweep above ran over a
    // fully-rendered certificate rather than a blank or truncated one.
    for (const copy of [
      SERVER_TRANSLATIONS.en.auditCertificate.title,
      SERVER_TRANSLATIONS.en.auditCertificate.contractSummary,
      SERVER_TRANSLATIONS.en.auditCertificate.participants,
      SERVER_TRANSLATIONS.en.auditCertificate.verificationMethod,
      SERVER_TRANSLATIONS.en.auditCertificate.timeline,
      SERVER_TRANSLATIONS.en.auditCertificate.actionDocumentCompleted,
      SERVER_TRANSLATIONS.en.auditCertificate.integrity,
      SERVER_TRANSLATIONS.en.auditCertificate.timeZone,
    ]) {
      expect(page).toContain(copy);
      expect(copy).not.toMatch(HANGUL);
    }
  });
});
