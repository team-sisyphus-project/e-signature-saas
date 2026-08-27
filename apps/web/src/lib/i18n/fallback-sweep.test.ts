import { type SupportedLocale } from '../locale';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslationKey,
  type WebTranslationParams,
} from '../web-translations';
import { webTranslationCoverage, type CoverageGapReason } from './coverage';
import { WEB_TRANSLATIONS, WEB_TRANSLATION_DOMAIN_NAMES } from './index';
import type { WebTranslationCatalog, WebTranslationCatalogs } from './types';

/**
 * Spec M-6, swept across the whole browser catalog.
 *
 * The single-key cases in `web-translations.test.ts` prove the fallback *rule*.
 * This file proves the rule holds for **every key of every declared domain** —
 * which is the claim M-6 actually makes, and the one a spot check cannot make:
 * a key whose Korean copy carries a slot the English copy does not, or a domain
 * someone wired under a rival prefix, is invisible to a test that names its own
 * key.
 *
 * The gap is made, never described. Each sweep runs the shipped `translate`
 * against a copy of the shipped catalogs with the English half deliberately
 * gapped, and asks three questions of every rendered string:
 *
 * - is it the Korean copy (not the key, not blank)?
 * - is every `{slot}` resolved, using the params the *English* copy asked for?
 * - did the gap reach the report the reporter reads?
 *
 * The gapped catalogs are freshly built objects; the shipped catalog is never
 * mutated, so these cases cannot leak into another suite.
 */

/** Substitution slot inside a catalog value, as the runtime defines it. */
const SLOT_PATTERN = /\{(\w+)\}/g;

/** `{name}` slots of one catalog value, in order of appearance. */
function slotsOf(value: string): string[] {
  return [...value.matchAll(SLOT_PATTERN)].map((match) => match[1] ?? '');
}

function copyAt(catalog: WebTranslationCatalog, key: string): string | undefined {
  const separator = key.indexOf('.');
  const value = catalog[key.slice(0, separator)]?.[key.slice(separator + 1)];
  return typeof value === 'string' ? value : undefined;
}

const DOMAIN_NAMES: string[] = [...WEB_TRANSLATION_DOMAIN_NAMES];

/** Keys of one domain, qualified and sorted — the order coverage reports in. */
function keysOf(domain: string): WebTranslationKey[] {
  return Object.keys(WEB_TRANSLATIONS.ko[domain] ?? {})
    .sort()
    .map((name) => `${domain}.${name}` as WebTranslationKey);
}

const ALL_KEYS: WebTranslationKey[] = DOMAIN_NAMES.flatMap(keysOf).sort();

/**
 * The params a caller renders this key with.
 *
 * Derived from the **English** copy on purpose: a caller supplies what the copy
 * it is looking at needs. Rendering the Korean fallback with those params is
 * exactly the moment slot drift between the two locales would surface as a
 * literal `{count}` on screen.
 */
function paramsFor(key: WebTranslationKey): WebTranslationParams | undefined {
  const english = copyAt(WEB_TRANSLATIONS.en, key);
  const slots = english === undefined ? [] : slotsOf(english);
  if (slots.length === 0) return undefined;
  return Object.fromEntries(slots.map((name) => [name, `<${name}>`]));
}

/** One locale's catalog with every declared key gapped in the given way. */
function gapped(reason: CoverageGapReason): WebTranslationCatalog {
  const catalog: Record<string, Record<string, string>> = {};
  for (const domain of DOMAIN_NAMES) {
    catalog[domain] =
      reason === 'missing'
        ? {}
        : Object.fromEntries(keysOf(domain).map((key) => [key.split('.')[1] ?? key, '   ']));
  }
  return catalog;
}

/** Shipped Korean copy, with no English copy left anywhere. */
function englishGapped(reason: CoverageGapReason): WebTranslationCatalogs {
  return { ko: WEB_TRANSLATIONS.ko, en: gapped(reason) };
}

/** The copy each key renders as in Korean, produced by the shipped runtime. */
function koreanCopyFor(key: WebTranslationKey, params: WebTranslationParams | undefined): string {
  return createWebTranslationRuntime(WEB_TRANSLATIONS).translate('ko', key, params);
}

/**
 * Every way one rendered string can fail the reader, collected rather than
 * thrown: a sweep must name every offending key in one run, not just the first.
 */
function defectsOf(key: WebTranslationKey, text: string): string[] {
  const defects: string[] = [];
  if (text.trim() === '') defects.push(`${key}: rendered blank`);
  if (text.includes(key)) defects.push(`${key}: exposed the raw key`);
  const unresolved = slotsOf(text);
  if (unresolved.length > 0) defects.push(`${key}: unresolved {${unresolved.join('} {')}}`);
  return defects;
}

describe.each<CoverageGapReason>(['missing', 'empty'])(
  'every English key %s from the catalog',
  (reason) => {
    const catalogs = englishGapped(reason);

    it.each(DOMAIN_NAMES)(
      'renders the Korean copy for every %s key, and lists each gap',
      (domain) => {
        const runtime = createWebTranslationRuntime(catalogs);
        const keys = keysOf(domain);
        const defects: string[] = [];

        for (const key of keys) {
          const params = paramsFor(key);
          const text = runtime.translate('en', key, params);

          defects.push(...defectsOf(key, text));
          const korean = koreanCopyFor(key, params);
          if (text !== korean) defects.push(`${key}: served "${text}", not the Korean "${korean}"`);
        }

        expect(defects).toEqual([]);
        // A domain with no keys would pass every assertion above by rendering
        // nothing at all, so the sweep states its own size.
        expect(keys.length).toBeGreaterThan(0);

        // The runtime half of the report: what this session actually replaced.
        // Asserted exhaustively, so a `placeholder` entry — an unresolved slot,
        // recorded by the runtime itself — would fail here too.
        expect(runtime.getFallbackReport()).toEqual({
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
        const coverage = webTranslationCoverage(catalogs);
        const forDomain = <T extends { key: string }>(rows: readonly T[]) =>
          rows.filter((row) => row.key.startsWith(`${domain}.`));

        expect(
          forDomain(coverage.locales.find((entry) => entry.locale === 'en')?.gaps ?? []),
        ).toEqual(keys.map((key) => ({ key, reason })));
        expect(coverage.locales.find((entry) => entry.locale === 'ko')?.gaps).toEqual([]);
        expect(forDomain(coverage.missingKeys.map((key) => ({ key })))).toEqual(
          keys.map((key) => ({ key })),
        );
      },
    );
  },
);

describe('a key written in neither locale', () => {
  const catalogs: WebTranslationCatalogs = { ko: gapped('missing'), en: gapped('missing') };
  const REQUESTED: SupportedLocale[] = ['ko', 'en'];

  it.each(DOMAIN_NAMES)('serves the pending-copy notice for every %s key', (domain) => {
    const runtime = createWebTranslationRuntime(catalogs);
    const keys = keysOf(domain);
    const defects: string[] = [];

    for (const key of keys) {
      for (const locale of REQUESTED) {
        const text = runtime.translate(locale, key, paramsFor(key));

        defects.push(...defectsOf(key, text));
        if (text !== UNKNOWN_WEB_TRANSLATION_FALLBACK) {
          defects.push(`${locale} ${key}: served "${text}", not the pending-copy notice`);
        }
      }
    }

    expect(defects).toEqual([]);
    expect(keys.length).toBeGreaterThan(0);

    const report = runtime.getFallbackReport();
    expect([...report.missingKeys].sort()).toEqual(keys);
    // The requested locale is what the ledger records — a Korean reader hitting
    // the notice is a Korean gap, not an English one.
    expect(report.entries.map((entry) => `${entry.requestedLocale}:${entry.key}`).sort()).toEqual(
      keys.flatMap((key) => REQUESTED.map((locale) => `${locale}:${key}`)).sort(),
    );

    // And the static half stays silent, which is why both halves exist. The web
    // key universe *is* the catalogs (the authoring type admits no ko-only
    // entry), so copy nobody ever wrote is invisible to a catalog walk — only a
    // call site asking for it reveals it, and that is the ledger's job.
    expect(webTranslationCoverage(catalogs).missingKeys).toEqual([]);
  });
});

describe('the shipped catalog', () => {
  it.each(DOMAIN_NAMES)('renders %s in English without falling back at all', (domain) => {
    const runtime = createWebTranslationRuntime(WEB_TRANSLATIONS);
    const defects: string[] = [];

    for (const key of keysOf(domain)) {
      const params = paramsFor(key);
      const text = runtime.translate('en', key, params);

      defects.push(...defectsOf(key, text));
      // Slot-free copy is compared verbatim; interpolated copy is covered by the
      // unresolved-slot check above, which is the part a reader would see.
      const english = copyAt(WEB_TRANSLATIONS.en, key);
      if (params === undefined && text !== english) {
        defects.push(`${key}: served "${text}", not the English "${english}"`);
      }
    }

    expect(defects).toEqual([]);
    // The paired assertion: no gap was reported *because* none exists, not
    // because nothing was looked up.
    expect(runtime.getFallbackReport()).toEqual({ missingKeys: [], entries: [] });
  });

  it('measures every declared domain, and a catalog worth sweeping', () => {
    expect(DOMAIN_NAMES.length).toBe(WEB_TRANSLATION_DOMAIN_NAMES.length);
    expect(ALL_KEYS.length).toBeGreaterThan(100);
    expect(webTranslationCoverage().missingKeys).toEqual([]);
  });
});
