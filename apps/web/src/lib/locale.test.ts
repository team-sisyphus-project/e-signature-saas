import {
  DEFAULT_LOCALE,
  getLinkLocale,
  linkLocaleFromSearch,
  linkLocaleQuery,
  localeFromBrowserLanguages,
  parseLocale,
  resolveLocale,
  resolvePublicEntryLocale,
  type LocaleResolutionInput,
  type PublicEntryLocaleInput,
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

/**
 * The link parameter is the only tier the runtime reads out of the URL, so its
 * reader is specified separately from `resolveLocale`: what it extracts, what it
 * refuses to interpret, and that it survives a server render with no `window`.
 */
describe('link locale parameter', () => {
  describe('reading a query string', () => {
    it('extracts the parameter with or without a leading question mark', () => {
      expect(linkLocaleFromSearch('?lang=en')).toBe('en');
      expect(linkLocaleFromSearch('lang=en')).toBe('en');
      expect(linkLocaleFromSearch('?token=abc&lang=en&ref=mail')).toBe('en');
    });

    it('returns nothing when the parameter is absent, empty or blank', () => {
      expect(linkLocaleFromSearch('')).toBeUndefined();
      expect(linkLocaleFromSearch(null)).toBeUndefined();
      expect(linkLocaleFromSearch(undefined)).toBeUndefined();
      expect(linkLocaleFromSearch('?token=abc')).toBeUndefined();
      expect(linkLocaleFromSearch('?lang=')).toBeUndefined();
      expect(linkLocaleFromSearch('?lang=%20%20')).toBeUndefined();
    });

    it('takes the first value when the parameter is repeated', () => {
      expect(linkLocaleFromSearch('?lang=en&lang=ko')).toBe('en');
    });

    it('hands unsupported tags through unchanged so the next tier can decide', () => {
      expect(linkLocaleFromSearch('?lang=fr')).toBe('fr');
      expect(
        resolveLocale({
          linkLocale: linkLocaleFromSearch('?lang=fr'),
          senderLocale: 'en',
          browserLanguages: ['ko-KR'],
        }),
      ).toBe('en');
    });

    it('feeds a supported tag into the tier above the sender', () => {
      expect(
        resolveLocale({
          linkLocale: linkLocaleFromSearch('?lang=en-US'),
          senderLocale: 'ko',
          browserLanguages: ['ko-KR'],
        }),
      ).toBe('en');
    });
  });

  describe('reading the current location', () => {
    const globals = globalThis as { window?: { location: { search: string } } };

    afterEach(() => {
      delete globals.window;
    });

    it('returns nothing when rendered without a window (SSR)', () => {
      expect(globals.window).toBeUndefined();
      expect(getLinkLocale()).toBeUndefined();
    });

    it('reads the parameter off the current URL in the browser', () => {
      globals.window = { location: { search: '?lang=en' } };

      expect(getLinkLocale()).toBe('en');
    });

    it('returns nothing when the current URL carries no parameter', () => {
      globals.window = { location: { search: '?token=abc' } };

      expect(getLinkLocale()).toBeUndefined();
    });
  });

  describe('forwarding to the API', () => {
    it('appends the parameter so the server resolves from the same tier', () => {
      expect(linkLocaleQuery('en')).toBe('?lang=en');
    });

    it('escapes values instead of letting them extend the query', () => {
      expect(linkLocaleQuery('en&admin=1')).toBe('?lang=en%26admin%3D1');
    });

    it('appends nothing when the link carries no parameter', () => {
      expect(linkLocaleQuery(undefined)).toBe('');
      expect(linkLocaleQuery(null)).toBe('');
      expect(linkLocaleQuery('')).toBe('');
    });
  });
});


/**
 * The logged-out entry path (signing links, share links) resolves without a
 * signed-in tier at all. It is specified separately from `resolveLocale`
 * because the two rules can diverge on the very same input, and the visitor of
 * a public link is not the account holder whose preference the browser may
 * still be holding.
 */
describe('public entry locale', () => {
  describe('the sender leads', () => {
    it("renders in the sender's English over a Korean browser", () => {
      expect(
        resolvePublicEntryLocale({ senderLocale: 'en', browserLanguages: ['ko-KR', 'ko'] }),
      ).toBe('en');
    });

    it("renders in the sender's Korean over an English browser", () => {
      expect(
        resolvePublicEntryLocale({ senderLocale: 'ko', browserLanguages: ['en-US', 'en'] }),
      ).toBe('ko');
    });

    it('accepts the sender preference in any region form', () => {
      expect(resolvePublicEntryLocale({ senderLocale: 'en-GB', browserLanguages: ['ko-KR'] })).toBe(
        'en',
      );
    });

    it('still yields to an explicit ?lang= on the link', () => {
      expect(
        resolvePublicEntryLocale({
          linkLocale: 'en',
          senderLocale: 'ko',
          browserLanguages: ['ko-KR'],
        }),
      ).toBe('en');
    });
  });

  describe('the browser leads once the sender tier is absent', () => {
    // A sender who predates the language preference has none stored, and the
    // server forwards that column as-is. Every shape of "nothing" must reach the
    // browser rather than being read as a choice of Korean.
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty string', ''],
      ['whitespace', '   '],
      ['an unsupported language', 'fr-FR'],
    ])('uses the English browser when the sender preference is %s', (_label, senderLocale) => {
      expect(resolvePublicEntryLocale({ senderLocale, browserLanguages: ['en-US', 'en'] })).toBe(
        'en',
      );
    });

    it('uses the first supported browser preference, skipping unsupported ones', () => {
      expect(resolvePublicEntryLocale({ browserLanguages: ['fr-FR', 'en-GB', 'ko-KR'] })).toBe('en');
    });

    it('falls back to Korean only when nothing at all is known', () => {
      expect(resolvePublicEntryLocale({})).toBe(DEFAULT_LOCALE);
      expect(resolvePublicEntryLocale()).toBe(DEFAULT_LOCALE);
      expect(
        resolvePublicEntryLocale({ senderLocale: null, browserLanguages: ['fr-FR', 'ja-JP'] }),
      ).toBe(DEFAULT_LOCALE);
    });

    /**
     * The regression this function exists to prevent: feeding the sender tier a
     * locale that some other layer already resolved. A resolved value has the
     * Korean default baked in, so it can never be absent — and an absent sender
     * preference would then never reach the browser tier.
     */
    it('would be pinned to Korean if handed an already-resolved locale instead', () => {
      const browserLanguages = ['en-US', 'en'];

      expect(resolvePublicEntryLocale({ senderLocale: null, browserLanguages })).toBe('en');
      // What the pre-fix contexts passed: `meta.locale`, the server's answer.
      expect(resolvePublicEntryLocale({ senderLocale: 'ko', browserLanguages })).toBe('ko');
    });
  });

  describe('a signed-in preference never reaches a public screen', () => {
    // The tier is absent from the parameter list, so a caller can only supply it
    // by widening the type. These cases pin the runtime behaviour if one does.
    const withUserLocale = (userLocale: string, input: PublicEntryLocaleInput) =>
      ({ ...input, userLocale }) as PublicEntryLocaleInput;

    it('ignores a signed-in Korean preference and follows the English sender', () => {
      const input = withUserLocale('ko', { senderLocale: 'en', browserLanguages: ['ko-KR'] });

      expect(resolvePublicEntryLocale(input)).toBe('en');
      // The same input through the signed-in resolver answers differently — that
      // divergence is what makes the separate function load-bearing.
      expect(resolveLocale(input as LocaleResolutionInput)).toBe('ko');
    });

    it('ignores a signed-in English preference and follows the Korean sender', () => {
      const input = withUserLocale('en', { senderLocale: 'ko', browserLanguages: ['ko-KR'] });

      expect(resolvePublicEntryLocale(input)).toBe('ko');
      expect(resolveLocale(input as LocaleResolutionInput)).toBe('en');
    });

    it('ignores a signed-in preference even when no other tier answers', () => {
      expect(resolvePublicEntryLocale(withUserLocale('en', {}))).toBe(DEFAULT_LOCALE);
    });
  });

  describe('purity', () => {
    it('does not mutate the input and is stable across repeated calls', () => {
      const input: PublicEntryLocaleInput = {
        senderLocale: 'en',
        browserLanguages: ['ko-KR'],
      };
      const snapshot = JSON.stringify(input);

      expect(resolvePublicEntryLocale(input)).toBe('en');
      expect(resolvePublicEntryLocale(input)).toBe('en');
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });
});
