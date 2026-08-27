/**
 * What this suite proves: running the reporter leaves a *file* behind, and that
 * file names every gap with the locale, key and reason someone would need to go
 * fix it (Spec M-6, "a missing-key list is produced as a report").
 *
 * Two layers, on purpose:
 *
 * - The writer is exercised against fabricated coverage, so gaps of every shape
 *   can be asserted exactly — the shipped catalogs are complete today, and a
 *   suite that only ever sees them would pass while writing an empty file.
 * - The shipped path is exercised through the real coverage functions, so a
 *   catalog that moves out from under the collector fails here rather than in
 *   whatever CI job first opens the report.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SERVER_TRANSLATIONS,
  TRANSLATION_KEYS,
} from '../../../apps/api/src/i18n/server-translations';
import { serverTranslationCoverage } from '../../../apps/api/src/i18n/translation-coverage';
import {
  formatCoverageReport,
  webTranslationCoverage,
} from '../../../apps/web/src/lib/i18n/coverage';
import { collectSurfaces } from './collect';
import { DEFAULT_REPORT_FILENAME, resolveOutputPath } from './cli';
import {
  REPORT_VERSION,
  buildMissingKeyReport,
  countLabel,
  textPathFor,
  writeMissingKeyReport,
  type MissingKeyReport,
  type SurfaceCoverage,
} from './report';

let outDir: string;

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'i18n-report-'));
});

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true });
});

function readReport(path: string): MissingKeyReport {
  return JSON.parse(readFileSync(path, 'utf8')) as MissingKeyReport;
}

/** Two surfaces with hand-placed gaps of every shape the vocabulary allows. */
const FABRICATED: SurfaceCoverage[] = [
  {
    surface: 'web',
    coverage: {
      locales: [
        { locale: 'ko', totalKeys: 3, gaps: [{ key: 'demo.blank', reason: 'empty' }] },
        {
          locale: 'en',
          totalKeys: 3,
          gaps: [
            { key: 'demo.blank', reason: 'empty' },
            { key: 'demo.untranslated', reason: 'missing' },
          ],
        },
      ],
      missingKeys: ['demo.blank', 'demo.untranslated'],
    },
    text: 'web coverage text',
  },
  {
    surface: 'server',
    coverage: {
      locales: [
        { locale: 'ko', totalKeys: 2, gaps: [] },
        { locale: 'en', totalKeys: 2, gaps: [{ key: 'mail.subject', reason: 'missing' }] },
      ],
      missingKeys: ['mail.subject'],
      undeclaredEntries: ['ko:mail.legacy'],
    },
    text: 'server coverage text',
  },
];

describe('the report file', () => {
  it('writes every gap with its surface, locale, key and reason', () => {
    const jsonPath = join(outDir, 'i18n-missing-keys.json');

    const written = writeMissingKeyReport(FABRICATED, { jsonPath });

    expect(written.jsonPath).toBe(jsonPath);
    expect(readReport(jsonPath)).toEqual({
      version: REPORT_VERSION,
      summary: {
        gapCount: 4,
        missingKeyCount: 3,
        surfaces: [
          {
            surface: 'web',
            totalKeys: 3,
            gapCount: 3,
            missingKeyCount: 2,
            undeclaredEntryCount: 0,
          },
          {
            surface: 'server',
            totalKeys: 2,
            gapCount: 1,
            missingKeyCount: 1,
            undeclaredEntryCount: 1,
          },
        ],
      },
      gaps: [
        { surface: 'web', locale: 'ko', key: 'demo.blank', reason: 'empty' },
        { surface: 'web', locale: 'en', key: 'demo.blank', reason: 'empty' },
        { surface: 'web', locale: 'en', key: 'demo.untranslated', reason: 'missing' },
        { surface: 'server', locale: 'en', key: 'mail.subject', reason: 'missing' },
      ],
      missingKeys: [
        { surface: 'web', key: 'demo.blank', locales: ['ko', 'en'] },
        { surface: 'web', key: 'demo.untranslated', locales: ['en'] },
        { surface: 'server', key: 'mail.subject', locales: ['en'] },
      ],
      undeclaredEntries: [{ surface: 'server', entry: 'ko:mail.legacy' }],
    });
  });

  it('writes the human-readable text alongside, one section per surface', () => {
    const jsonPath = join(outDir, 'i18n-missing-keys.json');

    const { textPath } = writeMissingKeyReport(FABRICATED, { jsonPath });

    expect(textPath).toBe(join(outDir, 'i18n-missing-keys.txt'));
    const text = readFileSync(textPath as string, 'utf8');
    expect(text).toContain('[web]\nweb coverage text');
    expect(text).toContain('[server]\nserver coverage text');
    expect(text).toContain('total: 4 gaps across 3 keys');
    expect(text).toContain('undeclared: server ko:mail.legacy');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('says so plainly when nothing is missing', () => {
    const jsonPath = join(outDir, 'clean.json');
    const clean: SurfaceCoverage[] = [
      {
        surface: 'web',
        coverage: { locales: [{ locale: 'ko', totalKeys: 1, gaps: [] }], missingKeys: [] },
        text: 'web coverage text',
      },
    ];

    const { report } = writeMissingKeyReport(clean, { jsonPath });

    expect(report.summary.gapCount).toBe(0);
    expect(readReport(jsonPath).gaps).toEqual([]);
    expect(readFileSync(join(outDir, 'clean.txt'), 'utf8')).toContain('total: no missing keys');
  });

  it('creates the directories the requested path needs', () => {
    const jsonPath = join(outDir, 'reports', 'i18n', 'keys.json');

    writeMissingKeyReport(FABRICATED, { jsonPath });

    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(join(outDir, 'reports', 'i18n', 'keys.txt'))).toBe(true);
  });

  it('writes JSON only when the text artifact is declined', () => {
    const jsonPath = join(outDir, 'json-only.json');

    const { textPath } = writeMissingKeyReport(FABRICATED, { jsonPath, textPath: null });

    expect(textPath).toBeNull();
    expect(existsSync(join(outDir, 'json-only.txt'))).toBe(false);
  });

  it('is byte-identical across runs of the same catalogs', () => {
    const first = join(outDir, 'first.json');
    const second = join(outDir, 'second.json');

    writeMissingKeyReport(FABRICATED, { jsonPath: first });
    writeMissingKeyReport(FABRICATED, { jsonPath: second });

    // No timestamp, no set iteration order: a report that differs between two
    // runs of the same catalogs cannot be diffed, and diffing it is the point.
    expect(readFileSync(second, 'utf8')).toBe(readFileSync(first, 'utf8'));
  });

  it('reports a key its surface named even when no locale row explains it', () => {
    // The two lists come from the surface separately. Driving `missingKeys` off
    // the per-locale rows would let this disagreement disappear instead of show.
    const report = buildMissingKeyReport([
      {
        surface: 'server',
        coverage: { locales: [{ locale: 'ko', totalKeys: 1, gaps: [] }], missingKeys: ['a.b'] },
        text: '',
      },
    ]);

    expect(report.missingKeys).toEqual([{ surface: 'server', key: 'a.b', locales: [] }]);
  });

  it('counts in sentences, not in stubs', () => {
    // The text file is read by a person; `1 gaps` is the kind of seam that makes
    // a report look generated-and-unowned.
    expect(countLabel(1, 'gap')).toBe('1 gap');
    expect(countLabel(0, 'gap')).toBe('0 gaps');
    expect(countLabel(1, 'undeclared entry', 'undeclared entries')).toBe('1 undeclared entry');
    expect(countLabel(2, 'undeclared entry', 'undeclared entries')).toBe('2 undeclared entries');
  });

  it('names the text file after the JSON file', () => {
    expect(textPathFor('/tmp/keys.json')).toBe('/tmp/keys.txt');
    expect(textPathFor('/tmp/keys')).toBe('/tmp/keys.txt');
  });
});

describe('output path', () => {
  it('takes --out first, relative to where the command was typed', () => {
    expect(resolveOutputPath(['--out', 'reports/keys.json'], {}, '/work')).toBe(
      '/work/reports/keys.json',
    );
  });

  it('falls back to I18N_REPORT_OUT, then to the repo-root default', () => {
    expect(resolveOutputPath([], { I18N_REPORT_OUT: 'ci/keys.json' }, '/work')).toBe(
      '/work/ci/keys.json',
    );

    const fallback = resolveOutputPath([], {}, '/work');
    expect(fallback.endsWith(`/${DEFAULT_REPORT_FILENAME}`)).toBe(true);
    // Anchored to the repo, not the shell: `pnpm i18n:report` runs from the
    // package directory and must still land in one predictable place.
    expect(fallback.startsWith('/work/')).toBe(false);
  });

  it('refuses a --out with no path instead of writing somewhere surprising', () => {
    expect(() => resolveOutputPath(['--out'], {}, '/work')).toThrow('--out requires a path');
  });
});

describe('the shipped catalogs', () => {
  it('measures both halves, and neither half measures nothing', () => {
    const jsonPath = join(outDir, 'shipped.json');

    const { report } = writeMissingKeyReport(collectSurfaces(), { jsonPath });
    const [web, server] = report.summary.surfaces;

    expect(report.summary.surfaces.map((surface) => surface.surface)).toEqual(['web', 'server']);
    // Paired with the gap assertions below: "0 gaps" also passes when nothing
    // was counted, so the key universes are pinned to a non-trivial size.
    expect(web?.totalKeys).toBeGreaterThan(100);
    expect(server?.totalKeys).toBeGreaterThan(70);
    expect(readReport(jsonPath).summary).toEqual(report.summary);
  });

  it('carries a real web gap from the catalog into the file', () => {
    const jsonPath = join(outDir, 'web-gap.json');
    const doctored = webTranslationCoverage({
      ko: { demo: { hello: '안녕하세요', blank: '   ' } },
      en: { demo: { blank: 'Blank' } },
    });

    writeMissingKeyReport(
      [{ surface: 'web', coverage: doctored, text: formatCoverageReport(doctored) }],
      { jsonPath },
    );

    expect(readReport(jsonPath).gaps).toEqual([
      { surface: 'web', locale: 'ko', key: 'demo.blank', reason: 'empty' },
      { surface: 'web', locale: 'en', key: 'demo.hello', reason: 'missing' },
    ]);
  });

  it('carries a real server gap from the catalog into the file', () => {
    const jsonPath = join(outDir, 'server-gap.json');
    const key = TRANSLATION_KEYS[0] as string;
    const [scope, name] = key.split('.') as [string, string];
    const en: Record<string, Record<string, string>> = {
      ...(SERVER_TRANSLATIONS.en as Record<string, Record<string, string>>),
      [scope]: { ...(SERVER_TRANSLATIONS.en as Record<string, Record<string, string>>)[scope] },
    };
    delete en[scope]?.[name];

    const doctored = serverTranslationCoverage({ ko: SERVER_TRANSLATIONS.ko, en });
    writeMissingKeyReport(
      [{ surface: 'server', coverage: doctored, text: formatCoverageReport(doctored) }],
      { jsonPath },
    );

    const report = readReport(jsonPath);
    expect(report.gaps).toEqual([{ surface: 'server', locale: 'en', key, reason: 'missing' }]);
    expect(report.missingKeys).toEqual([{ surface: 'server', key, locales: ['en'] }]);
  });
});
