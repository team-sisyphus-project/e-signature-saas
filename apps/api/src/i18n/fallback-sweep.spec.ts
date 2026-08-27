import { Logger } from '@nestjs/common';
import type { SupportedLocale } from './locale-resolver';
import {
  SERVER_TRANSLATIONS,
  TRANSLATION_KEYS,
  UNKNOWN_SERVER_TRANSLATION_FALLBACK,
  getServerTranslationFallbackReport,
  readCatalog,
  resetServerTranslationFallbackReport,
  translate,
  type MissingServerTranslationReason,
  type ServerTranslationCatalog,
  type TranslationKey,
} from './server-translations';
import { serverTranslationCoverage } from './translation-coverage';

/**
 * Spec M-6, swept across every key `TranslationKey` declares.
 *
 * `translation-coverage.spec.ts` proves the fallback *rule* on one key, in every
 * shape a gap can take. This file asks the same three questions of the whole
 * catalog, because the claim M-6 makes is about all of it: every declared key,
 * gapped, still reaches the reader as human copy, and every gap lands in the
 * report the reporter reads.
 *
 * Server copy ends up in sent mail and signed PDFs — a key leaked there is
 * permanent, and a thrown error costs the whole artifact. So the gap is made,
 * not described: the shipped `en` catalog is swapped for a gapped copy of
 * itself (`jest.replaceProperty`, restored after every case) and the shipped
 * `translate` answers for what it does.
 *
 * The one thing this file cannot ask, unlike its web counterpart, is that slots
 * come out resolved — the server hands templates to callers, which interpolate.
 * The reachable defect there is *slot drift*: fallback copy that asks for a slot
 * the caller was never going to supply. That is what the slot comparison below
 * catches.
 */

/** Substitution slot inside a catalog value, as callers write it. */
const SLOT_PATTERN = /\{(\w+)\}/g;

function slotsOf(value: string): string[] {
  return [...value.matchAll(SLOT_PATTERN)].map((match) => match[1] ?? '').sort();
}

/** The catalogs as a mutable record, which is what `replaceProperty` needs. */
const catalogs = SERVER_TRANSLATIONS as unknown as Record<
  SupportedLocale,
  ServerTranslationCatalog
>;

/**
 * The shipped copy, captured at load time — before any case gaps a catalog.
 *
 * Reading it later would read the gap instead of the answer, and the oracle
 * would agree with whatever the runtime did.
 */
function shippedCopy(locale: SupportedLocale): Map<TranslationKey, string> {
  return new Map(
    TRANSLATION_KEYS.map((key) => [key, readCatalog(catalogs[locale], key).copy ?? '']),
  );
}

const KOREAN = shippedCopy('ko');
const ENGLISH = shippedCopy('en');

/** Declared keys grouped by scope — one sweep case per scope, so a failure
 *  names the part of the catalog that broke. */
const SCOPES: string[] = [...new Set(TRANSLATION_KEYS.map((key) => key.split('.')[0] ?? key))];

function keysOf(scope: string): TranslationKey[] {
  return TRANSLATION_KEYS.filter((key) => key.startsWith(`${scope}.`));
}

/** One locale's catalog with every declared key gapped in the given way. */
function gapped(reason: MissingServerTranslationReason): ServerTranslationCatalog {
  const catalog: Record<string, Record<string, string>> = {};
  for (const scope of SCOPES) {
    catalog[scope] =
      reason === 'missing'
        ? {}
        : Object.fromEntries(keysOf(scope).map((key) => [key.slice(scope.length + 1), '   ']));
  }
  return catalog;
}

/** Every way one served string can fail the reader, collected rather than
 *  thrown: a sweep must name every offending key in one run. */
function defectsOf(key: TranslationKey, text: string): string[] {
  const defects: string[] = [];
  if (text.trim() === '') defects.push(`${key}: served blank`);
  if (text.includes(key)) defects.push(`${key}: exposed the raw key`);
  return defects;
}

/** Gaps the static report lists for one locale, limited to one scope. */
function staticGaps(locale: SupportedLocale, scope: string) {
  const coverage = serverTranslationCoverage();
  return (coverage.locales.find((entry) => entry.locale === locale)?.gaps ?? []).filter((gap) =>
    gap.key.startsWith(`${scope}.`),
  );
}

describe('server fallback sweep', () => {
  beforeEach(() => {
    resetServerTranslationFallbackReport();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetServerTranslationFallbackReport();
  });

  describe.each<MissingServerTranslationReason>(['missing', 'empty'])(
    'every English key %s from the catalog',
    (reason) => {
      beforeEach(() => {
        jest.replaceProperty(catalogs, 'en', gapped(reason));
      });

      it.each(SCOPES)('serves the Korean copy for every %s key, and lists each gap', (scope) => {
        const keys = keysOf(scope);
        const defects: string[] = [];

        for (const key of keys) {
          const text = translate('en', key);

          defects.push(...defectsOf(key, text));
          const korean = KOREAN.get(key);
          if (text !== korean) defects.push(`${key}: served "${text}", not the Korean "${korean}"`);
          // Slot drift: the caller interpolates for the copy it asked for, so
          // Korean copy carrying a slot English never had renders as a literal
          // `{count}` in a sent email.
          const expected = slotsOf(ENGLISH.get(key) ?? '');
          if (slotsOf(text).join() !== expected.join()) {
            defects.push(
              `${key}: slots {${slotsOf(text).join('} {')}} ≠ {${expected.join('} {')}}`,
            );
          }
        }

        expect(defects).toEqual([]);
        // A scope with no keys would pass every assertion above by serving
        // nothing at all, so the sweep states its own size.
        expect(keys.length).toBeGreaterThan(0);

        // The runtime half of the report: what this process actually replaced.
        expect(getServerTranslationFallbackReport()).toEqual({
          missingKeys: keys,
          entries: keys.map((key) => ({
            key,
            requestedLocale: 'en',
            fallbackLocale: 'ko',
            reason,
            count: 1,
          })),
        });

        // The static half: the report `packages/i18n-report` reads to build the
        // missing-key file. Same gap, same key, same vocabulary.
        // The static report sorts its rows; the ledger keeps call order.
        const sorted = [...keys].sort();
        expect(staticGaps('en', scope)).toEqual(sorted.map((key) => ({ key, reason })));
        expect(staticGaps('ko', scope)).toEqual([]);
        expect(
          serverTranslationCoverage().missingKeys.filter((key) => key.startsWith(`${scope}.`)),
        ).toEqual(sorted);
      });
    },
  );

  describe('a key written in neither locale', () => {
    beforeEach(() => {
      jest.replaceProperty(catalogs, 'ko', gapped('missing'));
      jest.replaceProperty(catalogs, 'en', gapped('missing'));
    });

    it.each(SCOPES)('serves the pending-copy notice for every %s key', (scope) => {
      const keys = keysOf(scope);
      const defects: string[] = [];

      for (const key of keys) {
        for (const locale of ['ko', 'en'] as SupportedLocale[]) {
          const text = translate(locale, key);

          defects.push(...defectsOf(key, text));
          if (text !== UNKNOWN_SERVER_TRANSLATION_FALLBACK) {
            defects.push(`${locale} ${key}: served "${text}", not the pending-copy notice`);
          }
        }
      }

      expect(defects).toEqual([]);
      expect(keys.length).toBeGreaterThan(0);
      // The notice itself carries no slot: nothing downstream is left to fill.
      expect(slotsOf(UNKNOWN_SERVER_TRANSLATION_FALLBACK)).toEqual([]);

      // The requested locale is what the ledger records — a Korean reader
      // hitting the notice is a Korean gap, not an English one.
      const report = getServerTranslationFallbackReport();
      expect([...report.missingKeys].sort()).toEqual([...keys].sort());
      expect(report.entries.map((entry) => `${entry.requestedLocale}:${entry.key}`).sort()).toEqual(
        keys.flatMap((key) => [`ko:${key}`, `en:${key}`]).sort(),
      );

      // Unlike the web catalog, the server declares its key universe as data,
      // so the static report sees this state too: copy written in neither
      // locale is a gap in both, and nobody has to call the key to find it.
      for (const locale of ['ko', 'en'] as SupportedLocale[]) {
        expect(staticGaps(locale, scope)).toEqual(
          [...keys].sort().map((key) => ({ key, reason: 'missing' })),
        );
      }
    });
  });

  describe('the shipped catalogs', () => {
    it.each(SCOPES)('serves %s in English without falling back at all', (scope) => {
      const defects: string[] = [];

      for (const key of keysOf(scope)) {
        const text = translate('en', key);

        defects.push(...defectsOf(key, text));
        if (text !== ENGLISH.get(key)) {
          defects.push(`${key}: served "${text}", not the English "${ENGLISH.get(key)}"`);
        }
      }

      expect(defects).toEqual([]);
      // The paired assertion: no gap was reported *because* none exists, not
      // because nothing was looked up.
      expect(getServerTranslationFallbackReport()).toEqual({ missingKeys: [], entries: [] });
    });

    it('sweeps every declared scope, and a key universe worth sweeping', () => {
      expect(SCOPES.flatMap(keysOf)).toEqual([...TRANSLATION_KEYS]);
      expect(TRANSLATION_KEYS.length).toBeGreaterThan(70);
      expect(serverTranslationCoverage().missingKeys).toEqual([]);
    });
  });
});
