/**
 * Static ko/en coverage of the shipped catalog.
 *
 * The runtime report in `lib/web-translations.ts` answers "what did this session
 * actually fail to find?" — it can only see keys someone looked up. This module
 * answers the complementary question ahead of time: given the catalog as
 * authored, which keys have no usable copy in which locale?
 *
 * Spec M-6 asks for a missing-key list to be *produced as a report*. Producing
 * it from the composed catalogs (rather than the authored domains) is
 * deliberate: it is the same data structure the browser reads at runtime, so a
 * gap the report clears is a gap the browser cannot hit either.
 */

import { SUPPORTED_LOCALES, type SupportedLocale } from '../locale';
import { WEB_TRANSLATIONS } from './index';
import type { WebTranslationCatalogs } from './types';

/** Why a key counts as uncovered. Mirrors the runtime's vocabulary. */
export type CoverageGapReason = 'missing' | 'empty';

export interface CoverageGap {
  /** Fully qualified `domain.key`. */
  key: string;
  reason: CoverageGapReason;
}

export interface LocaleCoverage {
  locale: SupportedLocale;
  /** Number of keys declared across every domain of the catalog. */
  totalKeys: number;
  /** Keys with no usable copy in this locale, sorted. */
  gaps: readonly CoverageGap[];
}

export interface WebTranslationCoverage {
  locales: readonly LocaleCoverage[];
  /** Union of every gap in every locale — the headline "missing keys" list. */
  missingKeys: readonly string[];
}

/** Every `domain.key` present in any locale of `catalogs`, sorted. */
function allKeys(catalogs: WebTranslationCatalogs): string[] {
  const keys = new Set<string>();
  for (const locale of SUPPORTED_LOCALES) {
    for (const [domain, entries] of Object.entries(catalogs[locale] ?? {})) {
      for (const key of Object.keys(entries ?? {})) keys.add(`${domain}.${key}`);
    }
  }
  return [...keys].sort();
}

/**
 * Coverage of `catalogs`, defaulting to the shipped browser catalog.
 *
 * The key *universe* is the union across locales, not one locale's key set:
 * a key that exists only in Korean must be reported as an English gap, and
 * intersecting would make exactly that case invisible.
 */
export function webTranslationCoverage(
  catalogs: WebTranslationCatalogs = WEB_TRANSLATIONS,
): WebTranslationCoverage {
  const keys = allKeys(catalogs);
  const missing = new Set<string>();

  const locales = SUPPORTED_LOCALES.map((locale) => {
    const gaps: CoverageGap[] = [];

    for (const key of keys) {
      const separator = key.indexOf('.');
      const value = catalogs[locale]?.[key.slice(0, separator)]?.[key.slice(separator + 1)];
      if (value == null) gaps.push({ key, reason: 'missing' });
      else if (value.trim() === '') gaps.push({ key, reason: 'empty' });
      else continue;
      missing.add(key);
    }

    return { locale, totalKeys: keys.length, gaps };
  });

  return { locales, missingKeys: [...missing].sort() };
}

/** Human-readable coverage report, for CI logs and hand inspection. */
export function formatCoverageReport(coverage: WebTranslationCoverage): string {
  const lines = ['i18n catalog coverage'];

  for (const { locale, totalKeys, gaps } of coverage.locales) {
    const covered = totalKeys - gaps.length;
    const pct = totalKeys === 0 ? '100.0' : ((covered / totalKeys) * 100).toFixed(1);
    lines.push(`  ${locale}: ${covered}/${totalKeys} keys (${pct}%)`);
    for (const gap of gaps) lines.push(`    - ${gap.key} [${gap.reason}]`);
  }

  lines.push(
    coverage.missingKeys.length === 0
      ? '  no missing keys'
      : `  missing keys: ${coverage.missingKeys.length}`,
  );

  return lines.join('\n');
}
