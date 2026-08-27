import {
  DEFAULT_LOCALE,
  localeFromBrowserLanguages,
  parseLocale,
  resolveLocale,
  type LocaleResolutionInput,
  type SupportedLocale,
} from './locale';

/**
 * The tiers of `resolveLocale`, highest priority first. Each case below states
 * the whole input, so the table doubles as the readable specification of the
 * precedence rule rather than a set of isolated assertions.
 */
const PRIORITY_MATRIX: ReadonlyArray<{
  tier: string;
  input: LocaleResolutionInput;
  expected: SupportedLocale;
}> = [
  {
    tier: 'user preference wins over every lower tier',
    input: {
      userLocale: 'en',
      linkLocale: 'ko',
      senderLocale: 'ko',
      browserLanguages: ['ko-KR'],
    },
    expected: 'en',
  },
  {
    tier: 'link parameter wins once no user preference exists',
    input: { linkLocale: 'en', senderLocale: 'ko', browserLanguages: ['ko-KR'] },
    expected: 'en',
  },
  {
    tier: 'sender wins once no user preference and no link parameter exist',
    input: { senderLocale: 'en', browserLanguages: ['ko-KR'] },
    expected: 'en',
  },
  {
    tier: 'browser wins once every stored and link tier is absent',
    input: { browserLanguages: ['en-GB'] },
    expected: 'en',
  },
  {
    tier: 'Korean default applies when no tier supplies a locale',
    input: {},
    expected: DEFAULT_LOCALE,
  },
];

describe('web locale resolver', () => {
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

    it('prefers the sender locale over a conflicting browser preference', () => {
      expect(resolveLocale({ senderLocale: 'ko', browserLanguages: ['en-US'] })).toBe('ko');
    });
  });

  describe('unsupported values fall through instead of short-circuiting', () => {
    it('skips an unsupported user preference and honours the link parameter', () => {
      expect(resolveLocale({ userLocale: 'fr', linkLocale: 'en', senderLocale: 'ko' })).toBe('en');
    });

    it('skips an unsupported link parameter and honours the sender locale', () => {
      expect(resolveLocale({ linkLocale: 'ja', senderLocale: 'en', browserLanguages: ['ko'] })).toBe(
        'en',
      );
    });

    it('skips an unsupported sender locale and honours the browser preference', () => {
      expect(resolveLocale({ senderLocale: 'de-DE', browserLanguages: ['en-US'] })).toBe('en');
    });

    it('treats empty and null tiers as absent rather than as the default', () => {
      expect(
        resolveLocale({ userLocale: '', linkLocale: null, senderLocale: '   ', browserLanguages: ['en'] }),
      ).toBe('en');
    });

    it('falls back to Korean when every tier holds an unsupported tag', () => {
      expect(
        resolveLocale({
          userLocale: 'fr',
          linkLocale: 'ja',
          senderLocale: 'de',
          browserLanguages: ['zh-CN', 'es-ES'],
        }),
      ).toBe('ko');
    });
  });

  describe('browser preference list', () => {
    it('uses the first supported entry and ignores unsupported ones', () => {
      expect(localeFromBrowserLanguages(['fr-FR', 'en-GB', 'ko-KR'])).toBe('en');
    });

    it('returns nothing for empty, absent or fully unsupported lists', () => {
      expect(localeFromBrowserLanguages([])).toBeUndefined();
      expect(localeFromBrowserLanguages(null)).toBeUndefined();
      expect(localeFromBrowserLanguages(['fr-FR', 'ja-JP'])).toBeUndefined();
    });
  });

  describe('purity', () => {
    it('does not mutate the input and is stable across repeated calls', () => {
      const input: LocaleResolutionInput = {
        linkLocale: 'en',
        senderLocale: 'ko',
        browserLanguages: ['ko-KR'],
      };
      const snapshot = JSON.stringify(input);

      expect(resolveLocale(input)).toBe('en');
      expect(resolveLocale(input)).toBe('en');
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });
});
