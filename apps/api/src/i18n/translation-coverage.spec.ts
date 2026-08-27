import { Logger } from '@nestjs/common';
import type { SupportedLocale } from './locale-resolver';
import {
  SERVER_TRANSLATIONS,
  TRANSLATION_KEYS,
  UNKNOWN_SERVER_TRANSLATION_FALLBACK,
  getServerTranslationFallbackReport,
  resetServerTranslationFallbackReport,
  translate,
  type ServerTranslationCatalogs,
  type TranslationKey,
} from './server-translations';
import { serverTranslationCoverage } from './translation-coverage';

/**
 * Spec M-6: a missing key must reach the reader as Korean copy — never as the
 * raw key, never blank — and must be *listed* afterwards.
 *
 * Two reports answer that, and both are exercised against a real gap rather
 * than a description of one. The catalogs ship complete today, so the gap is
 * made by taking a key away (`jest.replaceProperty`, restored after each case)
 * and asking the shipped code what it does. A test that only fed a synthetic
 * catalog to the coverage function would pass while `translate` leaked the key.
 */

/** A key the reader can be shown, as a catalog leaf the test can take away. */
type MutableScope = Record<string, string | undefined>;

/** The shipped `en` catalog, seen as the mutable record `replaceProperty` needs. */
function enScope(scope: keyof (typeof SERVER_TRANSLATIONS)['en']): MutableScope {
  return SERVER_TRANSLATIONS.en[scope] as unknown as MutableScope;
}

function koScope(scope: keyof (typeof SERVER_TRANSLATIONS)['ko']): MutableScope {
  return SERVER_TRANSLATIONS.ko[scope] as unknown as MutableScope;
}

/** The key used for every gap below. Its Korean copy is what must be served. */
const GAP_KEY = 'share.submitted' satisfies TranslationKey;
const GAP_KOREAN = SERVER_TRANSLATIONS.ko.share.submitted;

/** `translate` accepts published locales only; readers can still ask otherwise. */
const unpublished = (locale: string) => locale as SupportedLocale;

/** Drop one name from a scope, producing the catalog as it reads before a
 *  translator has written that entry. */
function withoutKey(scope: Record<string, unknown>, name: string): Record<string, unknown> {
  const { [name]: _dropped, ...rest } = scope;
  return rest;
}

/** The shipped catalogs with `share.submitted` edited in `en` only. */
function catalogsWithEnShare(share: Record<string, unknown>): ServerTranslationCatalogs {
  return {
    ko: SERVER_TRANSLATIONS.ko,
    en: { ...SERVER_TRANSLATIONS.en, share },
  } as ServerTranslationCatalogs;
}

describe('static catalog coverage', () => {
  describe('the shipped catalogs', () => {
    it('has usable copy for every declared key in both locales', () => {
      const coverage = serverTranslationCoverage();

      expect(coverage.missingKeys).toEqual([]);
      for (const locale of coverage.locales) {
        expect({ locale: locale.locale, gaps: locale.gaps }).toEqual({
          locale: locale.locale,
          gaps: [],
        });
      }
    });

    it('measures every declared key, in both published locales', () => {
      const coverage = serverTranslationCoverage();

      expect(coverage.locales.map((entry) => entry.locale)).toEqual(['ko', 'en']);
      expect(TRANSLATION_KEYS.length).toBeGreaterThan(70);
      for (const locale of coverage.locales) {
        expect(locale.totalKeys).toBe(TRANSLATION_KEYS.length);
      }
    });

    it('declares every entry the catalogs publish, so no copy is unreachable', () => {
      expect(serverTranslationCoverage().undeclaredEntries).toEqual([]);
    });
  });

  describe('a key written in Korean only', () => {
    const coverage = () =>
      serverTranslationCoverage(
        catalogsWithEnShare(withoutKey(SERVER_TRANSLATIONS.en.share, 'submitted')),
      );

    it('is an English gap', () => {
      const en = coverage().locales.find((entry) => entry.locale === 'en');

      expect(en?.gaps).toEqual([{ key: GAP_KEY, reason: 'missing' }]);
    });

    it('is not a Korean gap', () => {
      const ko = coverage().locales.find((entry) => entry.locale === 'ko');

      expect(ko?.gaps).toEqual([]);
    });

    it('is listed once in the headline missing-key list', () => {
      expect(coverage().missingKeys).toEqual([GAP_KEY]);
    });
  });

  it('counts blank copy as a gap, not as a translation', () => {
    const coverage = serverTranslationCoverage(
      catalogsWithEnShare({ ...SERVER_TRANSLATIONS.en.share, submitted: '   ' }),
    );

    expect(coverage.locales.find((entry) => entry.locale === 'en')?.gaps).toEqual([
      { key: GAP_KEY, reason: 'empty' },
    ]);
  });

  it('reports a key written in neither locale against both locales', () => {
    const coverage = serverTranslationCoverage({
      ko: {
        ...SERVER_TRANSLATIONS.ko,
        share: withoutKey(SERVER_TRANSLATIONS.ko.share, 'submitted'),
      },
      en: {
        ...SERVER_TRANSLATIONS.en,
        share: withoutKey(SERVER_TRANSLATIONS.en.share, 'submitted'),
      },
    } as ServerTranslationCatalogs);

    expect(coverage.locales.map((entry) => entry.gaps)).toEqual([
      [{ key: GAP_KEY, reason: 'missing' }],
      [{ key: GAP_KEY, reason: 'missing' }],
    ]);
    expect(coverage.missingKeys).toEqual([GAP_KEY]);
  });

  it('names copy no key declares, per locale, instead of ignoring it', () => {
    const coverage = serverTranslationCoverage(
      catalogsWithEnShare({ ...SERVER_TRANSLATIONS.en.share, neverRequested: 'Orphaned copy' }),
    );

    expect(coverage.undeclaredEntries).toEqual(['en:share.neverRequested']);
    expect(coverage.missingKeys).toEqual([]);
  });
});

describe('runtime fallback report', () => {
  beforeEach(() => {
    resetServerTranslationFallbackReport();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetServerTranslationFallbackReport();
  });

  describe('a key the English catalog has not been given', () => {
    beforeEach(() => {
      jest.replaceProperty(enScope('share'), 'submitted', undefined);
    });

    it('renders the Korean copy, never the raw key or a blank string', () => {
      const text = translate('en', GAP_KEY);

      expect(text).toBe(GAP_KOREAN);
      expect(text).not.toContain('share');
      expect(text).not.toContain('submitted');
      expect(text.trim()).not.toBe('');
    });

    it('appears in the runtime report, attributed to the requested locale', () => {
      translate('en', GAP_KEY);

      const report = getServerTranslationFallbackReport();

      expect(report.missingKeys).toEqual([GAP_KEY]);
      expect(report.entries).toEqual([
        {
          key: GAP_KEY,
          requestedLocale: 'en',
          fallbackLocale: 'ko',
          reason: 'missing',
          count: 1,
        },
      ]);
    });

    it('appears in the static report for the same catalog state', () => {
      const coverage = serverTranslationCoverage();

      expect(coverage.missingKeys).toEqual([GAP_KEY]);
      expect(coverage.locales.find((entry) => entry.locale === 'en')?.gaps).toEqual([
        { key: GAP_KEY, reason: 'missing' },
      ]);
    });

    it('counts repeat renders on one entry, and still logs once', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');

      translate('en', GAP_KEY);
      translate('en', GAP_KEY);
      translate('en', GAP_KEY);

      const report = getServerTranslationFallbackReport();

      expect(report.entries).toHaveLength(1);
      expect(report.entries[0].count).toBe(3);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('records the locale the caller asked for, even one we do not publish', () => {
      translate(unpublished('fr'), GAP_KEY);

      expect(getServerTranslationFallbackReport().entries).toEqual([
        expect.objectContaining({ requestedLocale: 'fr', fallbackLocale: 'ko' }),
      ]);
    });
  });

  it('reports blank English copy as an empty gap, and serves Korean', () => {
    jest.replaceProperty(enScope('share'), 'submitted', '   ');

    expect(translate('en', GAP_KEY)).toBe(GAP_KOREAN);
    expect(getServerTranslationFallbackReport().entries).toEqual([
      expect.objectContaining({ key: GAP_KEY, reason: 'empty' }),
    ]);
  });

  it('reports a Korean gap too, where the placeholder is what the reader gets', () => {
    jest.replaceProperty(koScope('share'), 'submitted', undefined);

    expect(translate('ko', GAP_KEY)).toBe(UNKNOWN_SERVER_TRANSLATION_FALLBACK);
    expect(getServerTranslationFallbackReport().entries).toEqual([
      expect.objectContaining({ key: GAP_KEY, requestedLocale: 'ko', reason: 'missing' }),
    ]);
  });

  it('stays empty while every requested key has localized copy', () => {
    translate('en', GAP_KEY);
    translate('ko', 'signing.completed');

    expect(getServerTranslationFallbackReport()).toEqual({ missingKeys: [], entries: [] });
  });

  it('hands out a snapshot: editing it cannot edit the ledger', () => {
    jest.replaceProperty(enScope('share'), 'submitted', undefined);
    translate('en', GAP_KEY);

    const report = getServerTranslationFallbackReport();
    report.entries[0].count = 99;
    (report.missingKeys as TranslationKey[]).push('common.sender');

    expect(getServerTranslationFallbackReport()).toEqual({
      missingKeys: [GAP_KEY],
      entries: [expect.objectContaining({ count: 1 })],
    });
  });

  it('clears on reset, so each reporting window starts empty', () => {
    jest.replaceProperty(enScope('share'), 'submitted', undefined);
    translate('en', GAP_KEY);

    resetServerTranslationFallbackReport();

    expect(getServerTranslationFallbackReport()).toEqual({ missingKeys: [], entries: [] });
  });

  it('leaves the shipped catalog whole once the gaps are restored', () => {
    expect(translate('en', GAP_KEY)).toBe(SERVER_TRANSLATIONS.en.share.submitted);
    expect(serverTranslationCoverage().missingKeys).toEqual([]);
  });
});
