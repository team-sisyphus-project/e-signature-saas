/* ────────────────────────────────────────────────────────────────────────────
 * "No Korean reaches an English visitor" — the public-flow half of M-2.
 *
 * `english-output.spec.ts` proves the same bar for the artifacts the server
 * *sends* (email, certificate). This file covers what the server *answers* to a
 * logged-out visitor standing on a signing or share link: every refusal, every
 * gate, and the success headline.
 *
 * The messages are asserted through the services and guards that throw them,
 * not by reading the catalog, because the defect this guards against is not a
 * missing translation — it is a call site that never asked for one. A catalog
 * can be perfectly bilingual while `MESSAGES` is still hardcoded one line below.
 * ──────────────────────────────────────────────────────────────────────────── */

import { ExecutionContext, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MESSAGES } from '../common/messages';
import { LinkPasswordCipher } from '../sharing/link-password-cipher';
import { ShareSessionGuard } from '../sharing/share-session.guard';
import { ShareSessionService } from '../sharing/share-session.service';
import { SharingService } from '../sharing/sharing.service';
import { SignerSessionGuard } from '../signing/signer-session.guard';
import { SignerSessionService } from '../signing/signer-session.service';
import { SigningService } from '../signing/signing.service';
import { SERVER_TRANSLATIONS } from './server-translations';

/** Hangul syllables — the shape an untranslated message takes. */
const HANGUL = /[가-힣]/;

const CONFIG = { get: () => undefined } as never;

/** The message a Nest `HttpException` actually puts in the response body. */
async function rejectionMessage(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected the call to reject, but it resolved');
}

/* ─────────────────────────── catalog shape ─────────────────────────── */

/** `scope.name` for every leaf of one locale's catalog. */
function keysOf(catalog: Record<string, Record<string, string>>): string[] {
  return Object.entries(catalog)
    .flatMap(([scope, names]) => Object.keys(names).map((name) => `${scope}.${name}`))
    .sort();
}

/** `{title}`-style placeholders a value carries, in order. */
function placeholders(value: string): string[] {
  return value.match(/\{[a-zA-Z]+\}/g) ?? [];
}

describe('server catalog symmetry', () => {
  const ko = SERVER_TRANSLATIONS.ko as unknown as Record<string, Record<string, string>>;
  const en = SERVER_TRANSLATIONS.en as unknown as Record<string, Record<string, string>>;

  it('publishes the same keys in Korean and English', () => {
    // Asymmetry is not a type error: a key present only in `ko` still satisfies
    // `TranslationKey`, and only shows up as a logged gap in production.
    expect(keysOf(en)).toEqual(keysOf(ko));
  });

  it('leaves no value blank in either locale', () => {
    for (const catalog of [ko, en]) {
      for (const names of Object.values(catalog)) {
        for (const value of Object.values(names)) {
          expect(typeof value).toBe('string');
          expect(value.trim()).not.toBe('');
        }
      }
    }
  });

  it('keeps the same placeholders on both sides of every templated value', () => {
    // A translation that drops `{title}` renders a sentence with a hole in it.
    for (const [scope, names] of Object.entries(ko)) {
      for (const [name, value] of Object.entries(names)) {
        expect([`${scope}.${name}`, placeholders(en[scope][name]).sort()]).toEqual([
          `${scope}.${name}`,
          placeholders(value).sort(),
        ]);
      }
    }
  });

  it('carries no Korean in the English public-flow scopes', () => {
    for (const scope of [SERVER_TRANSLATIONS.en.signing, SERVER_TRANSLATIONS.en.share]) {
      for (const value of Object.values(scope)) {
        expect(value).not.toMatch(HANGUL);
      }
    }
  });

  it('keeps the Korean public-flow copy identical to the owner-facing constant', () => {
    // The public routes stopped reading `MESSAGES`; a Korean visitor must not
    // be able to tell. Every key the catalog took over is compared verbatim.
    for (const [name, value] of Object.entries(SERVER_TRANSLATIONS.ko.signing)) {
      const previous =
        name === 'artifactNotReady'
          ? MESSAGES.document.artifactNotReady
          : (MESSAGES.signing as Record<string, string>)[name];
      expect([name, value]).toEqual([name, previous]);
    }
    for (const [name, value] of Object.entries(SERVER_TRANSLATIONS.ko.share)) {
      expect([name, value]).toEqual([name, (MESSAGES.share as Record<string, string>)[name]]);
    }
  });
});

/* ────────────────────────── signing link (OTP) ────────────────────────── */

/** A signing link whose sender wrote `senderLocale` in their settings. */
function verifyHarness(senderLocale: unknown, recentFailures = 0) {
  const prisma = {
    signRequest: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sr_1',
        status: 'VIEWED',
        verifyCode: '123456',
        document: { status: 'IN_PROGRESS', owner: { locale: senderLocale } },
      }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    auditLog: {
      count: jest.fn().mockResolvedValue(recentFailures),
      create: jest.fn().mockResolvedValue(undefined),
    },
  };
  const sessions = { issue: jest.fn().mockReturnValue('signer-session') };

  return new SigningService(prisma as never, {} as never, sessions as never, {} as never);
}

/** A completed-but-for-one-field signing request, ready for `complete`. */
function completeHarness(senderLocale: unknown, fieldValue: string | null) {
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
        id: 'sr_1',
        status: 'VIEWED',
        documentId: 'doc_1',
        document: { status: 'IN_PROGRESS', owner: { locale: senderLocale } },
        signFields: [{ id: 'field_1', value: fieldValue }],
      }),
    },
    $transaction: jest.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
  const completionQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };

  return new SigningService(prisma as never, {} as never, {} as never, completionQueue as never);
}

/** An anonymous request as the guards see it. */
function requestContext(headers: {
  authorization?: string;
  acceptLanguage?: string;
  lang?: string;
}): ExecutionContext {
  const request = {
    params: { token: 'link-token' },
    query: headers.lang === undefined ? {} : { lang: headers.lang },
    headers: {
      authorization: headers.authorization,
      'accept-language': headers.acceptLanguage,
    },
  };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function signerGuardFor(senderLocale: unknown) {
  const sessions = new SignerSessionService(new JwtService({}), CONFIG);
  const prisma = {
    signRequest: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sr_1',
        document: { owner: { locale: senderLocale } },
      }),
    },
  };
  return { guard: new SignerSessionGuard(sessions, prisma as never), sessions };
}

describe('an English sender’s signing link', () => {
  it('refuses a wrong verification code in English', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness('en').verify('link-token', '000000', '203.0.113.7', 'jest'),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.codeMismatch);
    expect(message).not.toMatch(HANGUL);
  });

  it('refuses a malformed verification code in English', async () => {
    const message = await rejectionMessage(() => verifyHarness('en').verify('link-token', '12'));

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.codeFormat);
    expect(message).not.toMatch(HANGUL);
  });

  it('announces the verification lockout in English', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness('en', 5).verify('link-token', '123456'),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.locked);
    expect(message).not.toMatch(HANGUL);
  });

  it('tells an expired signer session to re-enter the code, in English', async () => {
    const { guard } = signerGuardFor('en');

    const message = await rejectionMessage(() => guard.canActivate(requestContext({})));

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.sessionExpired);
    expect(message).not.toMatch(HANGUL);
  });

  it('rejects a session issued for another link in English', async () => {
    const { guard, sessions } = signerGuardFor('en');

    const message = await rejectionMessage(() =>
      guard.canActivate(requestContext({ authorization: `Bearer ${sessions.issue('other_sr')}` })),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.sessionExpired);
  });

  it('names the unfilled fields in English', async () => {
    const message = await rejectionMessage(() => completeHarness('en', null).complete('sr_1'));

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.fieldsIncomplete);
    expect(message).not.toMatch(HANGUL);
  });

  it('congratulates the signer in English when signing completes', async () => {
    const result = await completeHarness('en', 'Alex Kim').complete('sr_1');

    expect(result.message).toBe(SERVER_TRANSLATIONS.en.signing.completed);
    expect(result.message).not.toMatch(HANGUL);
    // The locale that rendered the copy travels with it, so a caller wrapping
    // this result (the share flow) does not have to resolve it a second time.
    expect(result.locale).toBe('en');
  });

  it('keeps admitting a valid session — the guard still guards', async () => {
    const { guard, sessions } = signerGuardFor('en');

    await expect(
      guard.canActivate(requestContext({ authorization: `Bearer ${sessions.issue('sr_1')}` })),
    ).resolves.toBe(true);
  });
});

/* ─────────────────────────────── share link ─────────────────────────────── */

const SHARE_PASSWORD = 'secret12';

function shareHarness(senderLocale: unknown, linkOverrides: Record<string, unknown> = {}) {
  const linkPassword = new LinkPasswordCipher(CONFIG);
  const link = {
    id: 'link_1',
    accessMode: 'LINK',
    status: 'VIEWED',
    linkExpiresAt: null,
    linkRevokedAt: null,
    linkPasswordCipher: linkPassword.encrypt(SHARE_PASSWORD),
    document: {
      title: 'Service Agreement',
      status: 'IN_PROGRESS',
      owner: { name: 'Sender', brandColor: null, brandLogoUrl: null, locale: senderLocale },
    },
    ...linkOverrides,
  };
  const prisma = {
    signRequest: {
      findUnique: jest.fn().mockResolvedValue(link),
      update: jest.fn().mockResolvedValue(undefined),
    },
    auditLog: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue(undefined),
    },
  };
  const sessions = new ShareSessionService(new JwtService({}), CONFIG);
  const signing = {
    complete: jest
      .fn()
      .mockResolvedValue({ status: 'SIGNED', documentCompleted: true, locale: 'en' }),
  };
  const sharing = new SharingService(
    prisma as never,
    CONFIG,
    sessions,
    signing as never,
    {} as never,
    linkPassword,
  );

  return { sharing, sessions, signing, prisma };
}

function shareGuardFor(senderLocale: unknown, linkOverrides: Record<string, unknown> = {}) {
  const sessions = new ShareSessionService(new JwtService({}), CONFIG);
  const prisma = {
    signRequest: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'link_1',
        accessMode: 'LINK',
        status: 'VIEWED',
        linkExpiresAt: null,
        linkRevokedAt: null,
        document: { owner: { locale: senderLocale } },
        ...linkOverrides,
      }),
    },
  };
  return { guard: new ShareSessionGuard(sessions, prisma as never), sessions };
}

describe('an English sender’s share link', () => {
  it('refuses a wrong password in English', async () => {
    const { sharing } = shareHarness('en');

    const message = await rejectionMessage(() => sharing.unlock('link-token', 'wrong-pass'));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.wrongPassword);
    expect(message).not.toMatch(HANGUL);
  });

  it('asks for the missing password in English', async () => {
    const { sharing } = shareHarness('en');

    const message = await rejectionMessage(() => sharing.unlock('link-token', undefined));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.passwordRequired);
  });

  it('reports an expired link in English, on the landing screen', async () => {
    const { sharing } = shareHarness('en', { linkExpiresAt: new Date(Date.now() - 60_000) });

    const message = await rejectionMessage(() => sharing.meta('link-token'));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.expired);
    expect(message).not.toMatch(HANGUL);
    await expect(sharing.meta('link-token')).rejects.toBeInstanceOf(GoneException);
  });

  it('reports a revoked link in English', async () => {
    const { sharing } = shareHarness('en', { linkRevokedAt: new Date() });

    const message = await rejectionMessage(() => sharing.meta('link-token'));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.revoked);
  });

  it('refuses a second submission in English', async () => {
    const { sharing } = shareHarness('en', { status: 'SIGNED' });

    const message = await rejectionMessage(() => sharing.unlock('link-token', SHARE_PASSWORD));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.alreadySubmitted);
  });

  it('tells an expired share session to reopen the link, in English', async () => {
    const { guard } = shareGuardFor('en');

    const message = await rejectionMessage(() => guard.canActivate(requestContext({})));

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.sessionExpired);
    expect(message).not.toMatch(HANGUL);
  });

  it('expires the link in English even on a session-gated request', async () => {
    const { guard, sessions } = shareGuardFor('en', {
      linkExpiresAt: new Date(Date.now() - 60_000),
    });

    const message = await rejectionMessage(() =>
      guard.canActivate(requestContext({ authorization: `Bearer ${sessions.issue('link_1')}` })),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.share.expired);
  });

  it('confirms the submission in English', async () => {
    const { sharing, signing } = shareHarness('en');

    const result = await sharing.submit('link_1', '203.0.113.7', 'jest');

    expect(result.message).toBe(SERVER_TRANSLATIONS.en.share.submitted);
    expect(result.message).not.toMatch(HANGUL);
    // The share flow reuses the signer completion machine, so the hints must
    // reach it — otherwise the errors it raises would answer in Korean.
    expect(signing.complete).toHaveBeenCalledWith('link_1', '203.0.113.7', 'jest', {});
  });
});

/* ──────────────────────── which tier answered ──────────────────────── */

describe('locale precedence on public routes', () => {
  it('answers a Korean sender’s link in Korean, browser notwithstanding', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness('ko').verify('link-token', '000000', undefined, undefined, {
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.ko.signing.codeMismatch);
  });

  it('answers in the browser language when the sender never chose one', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness(null).verify('link-token', '000000', undefined, undefined, {
        acceptLanguage: 'fr-FR,en-US;q=0.8',
      }),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.codeMismatch);
  });

  it('lets the link’s ?lang= outrank a Korean sender', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness('ko').verify('link-token', '000000', undefined, undefined, {
        linkLocale: 'en',
        acceptLanguage: 'ko-KR,ko;q=0.9',
      }),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.en.signing.codeMismatch);
  });

  it('falls back to Korean when no tier speaks a published language', async () => {
    const message = await rejectionMessage(() =>
      verifyHarness(undefined).verify('link-token', '000000', undefined, undefined, {
        linkLocale: 'fr',
        acceptLanguage: 'ja-JP',
      }),
    );

    expect(message).toBe(SERVER_TRANSLATIONS.ko.signing.codeMismatch);
  });

  it('reads the same tiers from the guard’s own request', async () => {
    // The guard resolves without a service in front of it, so its own reading
    // of `?lang=` and `Accept-Language` is a separate call site to guard.
    const { guard } = signerGuardFor(null);

    const browser = await rejectionMessage(() =>
      guard.canActivate(requestContext({ acceptLanguage: 'en-GB,en;q=0.9' })),
    );
    const link = await rejectionMessage(() =>
      guard.canActivate(requestContext({ lang: 'en', acceptLanguage: 'ko-KR' })),
    );

    expect(browser).toBe(SERVER_TRANSLATIONS.en.signing.sessionExpired);
    expect(link).toBe(SERVER_TRANSLATIONS.en.signing.sessionExpired);
  });
});
