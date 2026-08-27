/**
 * Static ko/en coverage of the server catalog.
 *
 * The runtime report in `server-translations.ts` answers "what did this process
 * actually fail to find?" — it can only see keys someone looked up, and a key
 * on a rare path (an email that has not been sent this week) stays invisible
 * until a reader hits it. This module answers the complementary question ahead
 * of time: given the catalog as authored, which keys have no usable copy in
 * which locale?
 *
 * It mirrors `apps/web/src/lib/i18n/coverage.ts` deliberately — Spec M-6 asks
 * for one missing-key list, and the two halves of the product must produce rows
 * that read the same way.
 */

import { SUPPORTED_LOCALES, type SupportedLocale } from './locale-resolver';
import {
  SERVER_TRANSLATIONS,
  TRANSLATION_KEYS,
  readCatalog,
  type MissingServerTranslationReason,
  type ServerTranslationCatalogs,
  type TranslationKey,
} from './server-translations';

export interface CoverageGap {
  key: TranslationKey;
  reason: MissingServerTranslationReason;
}

export interface LocaleCoverage {
  locale: SupportedLocale;
  /** Number of keys `TranslationKey` declares. */
  totalKeys: number;
  /** Declared keys with no usable copy in this locale, sorted. */
  gaps: readonly CoverageGap[];
}

export interface ServerTranslationCoverage {
  locales: readonly LocaleCoverage[];
  /** Union of every gap in every locale — the headline "missing keys" list. */
  missingKeys: readonly TranslationKey[];
  /**
   * Catalog entries no `TranslationKey` declares, as `locale:scope.name`.
   *
   * Copy nothing can request. It is not a gap — no reader will ever see a
   * fallback for it — but it is the other way a catalog and its callers drift
   * apart, and it is invisible to a report that only walks declared keys.
   */
  undeclaredEntries: readonly string[];
}

/** Every `scope.name` the catalogs publish, in any locale, as `locale:key`. */
function publishedEntries(catalogs: ServerTranslationCatalogs): { locale: string; key: string }[] {
  const entries: { locale: string; key: string }[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const [scope, names] of Object.entries(catalogs[locale] ?? {})) {
      for (const name of Object.keys(names ?? {}))
        entries.push({ locale, key: `${scope}.${name}` });
    }
  }
  return entries;
}

/**
 * Coverage of `catalogs`, defaulting to the shipped server catalog.
 *
 * The key *universe* is what `TranslationKey` declares, not one catalog's key
 * set: a key written only in Korean must be reported as an English gap, and a
 * key declared but written in neither locale — the state where every reader
 * gets the placeholder — must be reported for both. Intersecting the catalogs
 * would make exactly those cases invisible.
 */
export function serverTranslationCoverage(
  catalogs: ServerTranslationCatalogs = SERVER_TRANSLATIONS,
): ServerTranslationCoverage {
  const keys = [...TRANSLATION_KEYS].sort();
  const missing = new Set<TranslationKey>();

  const locales = SUPPORTED_LOCALES.map((locale) => {
    const gaps: CoverageGap[] = [];

    for (const key of keys) {
      const { gap } = readCatalog(catalogs[locale], key);
      if (!gap) continue;
      gaps.push({ key, reason: gap });
      missing.add(key);
    }

    return { locale, totalKeys: keys.length, gaps };
  });

  const declared = new Set<string>(TRANSLATION_KEYS);
  const undeclaredEntries = publishedEntries(catalogs)
    .filter((entry) => !declared.has(entry.key))
    .map((entry) => `${entry.locale}:${entry.key}`)
    .sort();

  return { locales, missingKeys: [...missing].sort(), undeclaredEntries };
}
