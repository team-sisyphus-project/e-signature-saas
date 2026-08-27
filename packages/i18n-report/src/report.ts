/**
 * The missing-key report: what it says, and how it reaches disk.
 *
 * Spec M-6 asks for two things. The runtime half — a reader never sees a raw
 * key — is owned by `translate()` / `translateWeb()`. This module owns the other
 * half: the *list*, as a file someone can open, diff and attach to a ticket.
 *
 * It is deliberately a pure function of data. The catalogs live in two apps and
 * loading them is `collect.ts`'s job; everything here works on plain coverage
 * shapes, so the writer can be tested against fabricated gaps without either
 * catalog being complete, empty, or even present.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Which half of the product a row came from. */
export type ReportSurface = 'web' | 'server';

/**
 * Schema version of the JSON artifact.
 *
 * Written into the file so a consumer that grew up on one shape can tell it is
 * reading another, instead of silently finding no `gaps` and reporting health.
 */
export const REPORT_VERSION = 1;

/**
 * The coverage shape this module consumes.
 *
 * Structural on purpose: `webTranslationCoverage()` and
 * `serverTranslationCoverage()` are declared in two packages that do not know
 * each other, and both already satisfy this. Depending on the shape rather than
 * on either declaration is what keeps this module free of app imports.
 */
export interface CoverageGapInput {
  key: string;
  /** `missing` (no value) or `empty` (whitespace only) — the shared vocabulary. */
  reason: string;
}

export interface LocaleCoverageInput {
  locale: string;
  totalKeys: number;
  gaps: readonly CoverageGapInput[];
}

export interface CoverageInput {
  locales: readonly LocaleCoverageInput[];
  missingKeys: readonly string[];
  /** Catalog entries no key declares. Only the server catalog can measure this. */
  undeclaredEntries?: readonly string[];
}

/** One surface's contribution: its coverage plus its already-rendered text. */
export interface SurfaceCoverage {
  surface: ReportSurface;
  coverage: CoverageInput;
  /** Human-readable rendering, produced by `formatCoverageReport`. */
  text: string;
}

/** One gap: the row shape M-6 asks for — locale, key, reason. */
export interface ReportGap {
  surface: ReportSurface;
  locale: string;
  key: string;
  reason: string;
}

/** One key that is short somewhere, with every locale that is short of it. */
export interface ReportMissingKey {
  surface: ReportSurface;
  key: string;
  locales: string[];
}

export interface ReportUndeclaredEntry {
  surface: ReportSurface;
  /** As the surface names it, e.g. `ko:share.submitted`. */
  entry: string;
}

export interface SurfaceSummary {
  surface: ReportSurface;
  /** Keys measured in this surface's catalog, per locale. */
  totalKeys: number;
  gapCount: number;
  missingKeyCount: number;
  undeclaredEntryCount: number;
}

export interface MissingKeyReport {
  version: number;
  summary: {
    gapCount: number;
    missingKeyCount: number;
    surfaces: SurfaceSummary[];
  };
  gaps: ReportGap[];
  missingKeys: ReportMissingKey[];
  undeclaredEntries: ReportUndeclaredEntry[];
}

/** Result of a write: the report itself and every path it landed on. */
export interface WrittenReport {
  report: MissingKeyReport;
  jsonPath: string;
  textPath: string | null;
}

export interface WriteOptions {
  jsonPath: string;
  /** Sibling text file. `null` writes JSON only. Defaults to `textPathFor(jsonPath)`. */
  textPath?: string | null;
}

/**
 * Every key of one surface is counted once per locale, so all locales report
 * the same `totalKeys`; the first one answers for the surface. A surface with
 * no locales reports 0 rather than throwing — an empty measurement is a real
 * (if alarming) state, and losing the whole report over it helps nobody.
 */
function totalKeysOf(coverage: CoverageInput): number {
  return coverage.locales[0]?.totalKeys ?? 0;
}

/**
 * Merge per-surface coverage into one artifact.
 *
 * Row order is the argument order, then each surface's own locale order, then
 * the key order the coverage functions already sorted into — deterministic all
 * the way down, because a report that reshuffles itself between runs cannot be
 * diffed, and diffing it is how a reviewer sees what one PR broke or fixed.
 */
export function buildMissingKeyReport(surfaces: readonly SurfaceCoverage[]): MissingKeyReport {
  const gaps: ReportGap[] = [];
  const missingKeys: ReportMissingKey[] = [];
  const undeclaredEntries: ReportUndeclaredEntry[] = [];
  const summaries: SurfaceSummary[] = [];

  for (const { surface, coverage } of surfaces) {
    const localesByKey = new Map<string, string[]>();

    for (const locale of coverage.locales) {
      for (const gap of locale.gaps) {
        gaps.push({ surface, locale: locale.locale, key: gap.key, reason: gap.reason });
        const shortOf = localesByKey.get(gap.key);
        if (shortOf) shortOf.push(locale.locale);
        else localesByKey.set(gap.key, [locale.locale]);
      }
    }

    // Driven by `missingKeys`, not by the map: the surface decides what counts
    // as its headline list, and this keeps a key it reports but whose per-locale
    // rows we never saw from vanishing silently.
    for (const key of coverage.missingKeys) {
      missingKeys.push({ surface, key, locales: localesByKey.get(key) ?? [] });
    }

    for (const entry of coverage.undeclaredEntries ?? []) {
      undeclaredEntries.push({ surface, entry });
    }

    summaries.push({
      surface,
      totalKeys: totalKeysOf(coverage),
      gapCount: coverage.locales.reduce((count, locale) => count + locale.gaps.length, 0),
      missingKeyCount: coverage.missingKeys.length,
      undeclaredEntryCount: coverage.undeclaredEntries?.length ?? 0,
    });
  }

  return {
    version: REPORT_VERSION,
    summary: {
      gapCount: gaps.length,
      missingKeyCount: missingKeys.length,
      surfaces: summaries,
    },
    gaps,
    missingKeys,
    undeclaredEntries,
  };
}

/**
 * The text artifact: each surface's `formatCoverageReport` output under its own
 * heading, closed by the merged count.
 *
 * The JSON is what tooling reads; this is what a person reads. Both are written
 * from the same call so they cannot disagree about the same run.
 */
export function formatMissingKeyReport(
  surfaces: readonly SurfaceCoverage[],
  report: MissingKeyReport,
): string {
  const lines = ['i18n missing-key report'];

  for (const { surface, text } of surfaces) {
    lines.push('', `[${surface}]`, text);
  }

  lines.push(
    '',
    report.summary.gapCount === 0
      ? 'total: no missing keys'
      : `total: ${countLabel(report.summary.gapCount, 'gap')} across ${countLabel(
          report.summary.missingKeyCount,
          'key',
        )}`,
  );

  for (const entry of report.undeclaredEntries) {
    lines.push(`  undeclared: ${entry.surface} ${entry.entry}`);
  }

  return `${lines.join('\n')}\n`;
}

/** `1 gap` / `2 gaps` — operator-facing text, so it reads like a sentence. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Sibling text path for a JSON path: `dir/name.json` → `dir/name.txt`. */
export function textPathFor(jsonPath: string): string {
  return jsonPath.endsWith('.json')
    ? `${jsonPath.slice(0, -'.json'.length)}.txt`
    : `${jsonPath}.txt`;
}

/**
 * Build the report and write it.
 *
 * Missing parent directories are created rather than reported: the caller asked
 * for a path, and `--out reports/i18n/keys.json` failing on a directory the tool
 * could have made is friction, not safety. Anything else — a read-only path, a
 * name taken by a directory — propagates, because a reporter that swallows its
 * own write failure would announce success over a stale file.
 *
 * The artifact carries no timestamp on purpose. Identical catalogs must produce
 * an identical file, so a committed report shows only real movement in `git
 * diff`; "when was this run" is the shell's business, not the report's.
 */
export function writeMissingKeyReport(
  surfaces: readonly SurfaceCoverage[],
  options: WriteOptions,
): WrittenReport {
  const report = buildMissingKeyReport(surfaces);
  const { jsonPath } = options;
  const textPath = options.textPath === undefined ? textPathFor(jsonPath) : options.textPath;

  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (textPath) {
    mkdirSync(dirname(textPath), { recursive: true });
    writeFileSync(textPath, formatMissingKeyReport(surfaces, report), 'utf8');
  }

  return { report, jsonPath, textPath };
}
