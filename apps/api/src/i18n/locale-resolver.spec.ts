import {
  DEFAULT_LOCALE,
  localeFromAcceptLanguage,
  parseLocale,
  resolveLocale,
  resolvePublicEntryLocale,
  type LocaleResolutionInput,
  type SupportedLocale,
} from './locale-resolver';
import { translate } from './server-translations';

/**
 * The tiers of `resolveLocale`, highest priority first. Each case states the
 * whole input, so the table doubles as the readable specification of the
 * precedence rule. It mirrors the web matrix in `apps/web/src/lib/locale.test.ts`
 * — the two resolvers must never drift apart.
 */
const PRIORITY_MATRIX: ReadonlyArray<{
  tier: string;
  input: LocaleResolutionInput;
  expected: SupportedLocale;
}> = [
  {
    tier: 'user preference wins over every lower tier',
    input: { userLocale: 'en', linkLocale: 'ko', senderLocale: 'ko', acceptLanguage: 'ko-KR' },
    expected: 'en',
  },
  {
    tier: 'link parameter wins once no user preference exists',
    input: { linkLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko-KR' },
    expected: 'en',
  },
  {
    tier: 'sender wins once no user preference and no link parameter exist',
    input: { senderLocale: 'en', acceptLanguage: 'ko-KR,ko;q=0.9' },
    expected: 'en',
  },
  {
    tier: 'Accept-Language wins once every stored and link tier is absent',
    input: { acceptLanguage: 'en-GB,en;q=0.9' },
    expected: 'en',
  },
  {
    tier: 'Korean default applies when no tier supplies a locale',
    input: {},
    expected: DEFAULT_LOCALE,
  },
];

describe('locale resolver', () => {
  describe('language tag normalisation', () => {
    it('accepts region and script variants of the published locales', () => {
      expect(parseLocale('en-US')).toBe('en');
      expect(parseLocale('ko_KR')).toBe('ko');
      expect(parseLocale('  EN  ')).toBe('en');
    });

    it('rejects unpublished, empty and malformed tags', () => {
      expect(parseLocale('fr-FR')).toBeUndefined();
      expect(parseLocale('english')).toBeUndefined();
      expect(parseLocale('')).toBeUndefined();
      expect(parseLocale('   ')).toBeUndefined();
      expect(parseLocale(null)).toBeUndefined();
      expect(parseLocale(undefined)).toBeUndefined();
    });
  });

  describe('priority matrix', () => {
    it.each(PRIORITY_MATRIX)('$tier', ({ input, expected }) => {
      expect(resolveLocale(input)).toBe(expected);
    });

    it('resolves to Korean when called with no argument at all', () => {
      expect(resolveLocale()).toBe('ko');
    });
  });

  describe('conflicts between tiers', () => {
    it('prefers the link parameter over the sender locale when they disagree', () => {
      expect(resolveLocale({ linkLocale: 'en', senderLocale: 'ko' })).toBe('en');
      expect(resolveLocale({ linkLocale: 'ko', senderLocale: 'en' })).toBe('ko');
    });

    it('prefers the user preference over a conflicting link parameter', () => {
      expect(resolveLocale({ userLocale: 'ko', linkLocale: 'en' })).toBe('ko');
    });

    it('prefers the sender locale over a conflicting Accept-Language header', () => {
      expect(resolveLocale({ senderLocale: 'ko', acceptLanguage: 'en-US' })).toBe('ko');
    });
  });

  describe('unsupported values fall through instead of short-circuiting', () => {
    it('skips an unsupported user preference and honours the link parameter', () => {
      expect(resolveLocale({ userLocale: 'fr', linkLocale: 'en', senderLocale: 'ko' })).toBe('en');
    });

    it('skips an unsupported link parameter and honours the sender locale', () => {
      expect(resolveLocale({ linkLocale: 'ja', senderLocale: 'en', acceptLanguage: 'ko' })).toBe('en');
    });

    it('skips an unsupported sender locale and honours the browser header', () => {
      expect(resolveLocale({ senderLocale: 'de-DE', acceptLanguage: 'en-US' })).toBe('en');
    });

    it('treats empty and null tiers as absent rather than as the default', () => {
      expect(
        resolveLocale({
          userLocale: '',
          linkLocale: null,
          senderLocale: '   ',
          acceptLanguage: 'en',
        }),
      ).toBe('en');
    });

    it('falls back to Korean when every tier holds an unsupported tag', () => {
      expect(
        resolveLocale({
          userLocale: 'fr',
          linkLocale: 'ja',
          senderLocale: 'de',
          acceptLanguage: 'zh-CN,es-ES;q=0.8',
        }),
      ).toBe('ko');
    });
  });

  describe('Accept-Language header parsing', () => {
    it('recognises browser region tags and quality preferences', () => {
      expect(localeFromAcceptLanguage('fr;q=0.9, en-US;q=0.8, ko;q=0.7')).toBe('en');
    });

    it('keeps header order when qualities tie', () => {
      expect(localeFromAcceptLanguage('ko,en')).toBe('ko');
      expect(localeFromAcceptLanguage('en,ko')).toBe('en');
    });

    it('ignores entries explicitly refused with q=0', () => {
      expect(localeFromAcceptLanguage('en;q=0, ko;q=0.5')).toBe('ko');
    });

    it('returns nothing for empty, absent or fully unsupported headers', () => {
      expect(localeFromAcceptLanguage('')).toBeUndefined();
      expect(localeFromAcceptLanguage(null)).toBeUndefined();
      expect(localeFromAcceptLanguage('fr-FR,ja-JP;q=0.8')).toBeUndefined();
    });
  });

  describe('purity', () => {
    it('does not mutate the input and is stable across repeated calls', () => {
      const input: LocaleResolutionInput = {
        linkLocale: 'en',
        senderLocale: 'ko',
        acceptLanguage: 'ko-KR',
      };
      const snapshot = JSON.stringify(input);

      expect(resolveLocale(input)).toBe('en');
      expect(resolveLocale(input)).toBe('en');
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });

  it('falls back safely to Korean copy', () => {
    expect(resolveLocale({ acceptLanguage: 'fr-FR' })).toBe('ko');
    expect(translate('en', 'signing.completed')).toBe('Signing is complete!');
  });
});

/**
 * The logged-out resolver. Its guarantee is an absence: a public link is opened
 * by someone who is not the account holder, so no stored preference of a signed-in
 * user may reach it. Mirrors `resolvePublicEntryLocale` on the web.
 */
describe('resolvePublicEntryLocale', () => {
  it('follows link → sender → browser → Korean', () => {
    expect(resolvePublicEntryLocale({ linkLocale: 'en', senderLocale: 'ko' })).toBe('en');
    expect(resolvePublicEntryLocale({ senderLocale: 'en', acceptLanguage: 'ko-KR' })).toBe('en');
    expect(resolvePublicEntryLocale({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
    expect(resolvePublicEntryLocale({ acceptLanguage: 'fr-FR' })).toBe(DEFAULT_LOCALE);
    expect(resolvePublicEntryLocale()).toBe(DEFAULT_LOCALE);
  });

  it('drops a signed-in preference that reaches it at runtime', () => {
    // Types are gone at runtime, and a `userLocale` can arrive by spread from a
    // shared request object. The parameters are destructured so it is lost
    // before any tier is evaluated — and the answer differs from `resolveLocale`
    // on the same input, which is the guarantee itself.
    const leaked = { userLocale: 'en', acceptLanguage: 'ko-KR' } as LocaleResolutionInput;

    expect(resolvePublicEntryLocale(leaked)).toBe('ko');
    expect(resolveLocale(leaked)).toBe('en');
  });
});
