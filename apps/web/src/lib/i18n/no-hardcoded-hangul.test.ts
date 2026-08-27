/**
 * The regression guard for the whole i18n migration.
 *
 * Six grains moved every screen's Korean into `lib/i18n/`. Nothing so far stops
 * grain seven of the *next* feature from typing a Korean sentence straight into
 * a component — and that is how a translated product quietly untranslates
 * itself, one hotfix at a time. This test walks the web app and the shared UI
 * package and fails on any Hangul that can reach a screen.
 *
 * It also emits the ko/en coverage report (spec M-6), so a run that passes has
 * proved two separate things: no copy escaped the catalog, and nothing in the
 * catalog is waiting on a translator.
 *
 * Korean in *comments* is deliberately allowed — see `hangul-scan.ts`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatCoverageReport, webTranslationCoverage } from './coverage';
import {
  formatHangulFindings,
  scanSourceForHangul,
  scanTreeForHangul,
  type HangulAllowlistEntry,
} from './hangul-scan';

/** Repository root: `apps/web/src/lib/i18n` → four levels up is `apps/web`. */
const WEB_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');

/**
 * Trees that can render user-facing copy. `packages/ui` is included because a
 * design-system primitive's `aria-label` reaches a screen reader exactly like a
 * component's does — that is where two of this migration's last Korean strings
 * were hiding.
 */
const SCAN_ROOTS = [path.join(WEB_ROOT, 'src'), path.join(REPO_ROOT, 'packages/ui/src')];

/**
 * The complete exemption list. Every entry needs a reason, and the reason has to
 * be about *why Korean belongs there* — not "we didn't get to it".
 */
const ALLOWLIST: readonly HangulAllowlistEntry[] = [
  {
    file: 'apps/web/src/lib/i18n/common.ts',
    reason: 'Catalog domain — the Korean side of every shared entry lives here.',
  },
  { file: 'apps/web/src/lib/i18n/auth.ts', reason: 'Catalog domain: sign-in / sign-up.' },
  { file: 'apps/web/src/lib/i18n/dashboard.ts', reason: 'Catalog domain: sender dashboard.' },
  { file: 'apps/web/src/lib/i18n/wizard.ts', reason: 'Catalog domain: send wizard.' },
  { file: 'apps/web/src/lib/i18n/settings.ts', reason: 'Catalog domain: settings and branding.' },
  { file: 'apps/web/src/lib/i18n/templates.ts', reason: 'Catalog domain: my templates.' },
  { file: 'apps/web/src/lib/i18n/contracts.ts', reason: 'Catalog domain: contract detail.' },
  { file: 'apps/web/src/lib/i18n/signer.ts', reason: 'Catalog domain: signing link.' },
  { file: 'apps/web/src/lib/i18n/share.ts', reason: 'Catalog domain: share link.' },
  {
    file: 'apps/web/src/lib/web-translations.ts',
    reason:
      'Holds UNKNOWN_WEB_TRANSLATION_FALLBACK — the last-resort line shown when even the ' +
      'Korean base catalog has no copy. It cannot itself come from the catalog it backstops.',
  },
  {
    file: 'apps/web/src/app/%5Fdesign/page.tsx',
    reason:
      'Internal design-system gallery. The directory name is URL-escaped so Next keeps it ' +
      'out of the route tree; it is never shown to a customer, and its Korean specimen ' +
      'text is what exercises Hangul metrics in the type scale.',
  },
];

/**
 * Test files are exempt as a class rather than one by one: their Korean is
 * assertion data ("this key renders 로그인"), which is the opposite of a leak —
 * it is the copy being pinned down. Listing them individually would make every
 * new test file a guard failure.
 */
function isTestFile(file: string): boolean {
  return /\.(test|spec)\.tsx?$/.test(file);
}

describe('hardcoded Hangul regression guard', () => {
  const findings = scanTreeForHangul(SCAN_ROOTS, REPO_ROOT, ALLOWLIST).filter(
    (finding) => !isTestFile(finding.file),
  );

  it('finds no Korean literal outside the catalog and the documented allowlist', () => {
    expect(formatHangulFindings(findings)).toBe('');
  });

  it('keeps every allowlist entry real, unique and justified', () => {
    const files = ALLOWLIST.map((entry) => entry.file);

    expect(new Set(files).size).toBe(files.length);
    for (const entry of ALLOWLIST) {
      expect(fs.existsSync(path.join(REPO_ROOT, entry.file))).toBe(true);
      // An exemption without a stated reason is indistinguishable from a
      // forgotten migration, so the reason has to say something.
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  it('would still catch a leak in an allowlisted domain file', () => {
    // Guards the guard: an allowlist that silently matched everything, or a
    // scanner that stopped recognising JSX text, would leave the first test
    // green forever.
    const leak = scanSourceForHangul(
      'apps/web/src/components/leak.tsx',
      [
        'const label = "저장";',
        'const shout = `${name}님 환영합니다`;',
        'export const View = () => <p>안녕하세요</p>;',
      ].join('\n'),
    );

    expect(leak.map((f) => f.kind)).toEqual(['string', 'template', 'jsx-text']);
  });

  it('does not flag Korean written for engineers', () => {
    const comments = scanSourceForHangul(
      'apps/web/src/lib/notes.ts',
      ['// 이 값은 서버가 정한다.', '/** 문서화 주석. */', 'export const RETRIES = 3;'].join('\n'),
    );

    expect(comments).toEqual([]);
  });
});

describe('ko/en translation coverage report', () => {
  const coverage = webTranslationCoverage();

  // The report is the deliverable of spec M-6, so it is emitted on every run
  // rather than only on failure — a passing run should still show the numbers.
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.info(formatCoverageReport(coverage));
  });

  it('reports a non-trivial catalog rather than an empty one', () => {
    for (const locale of coverage.locales) {
      expect(locale.totalKeys).toBeGreaterThan(100);
    }
  });

  it('lists zero missing keys in either locale', () => {
    expect(coverage.missingKeys).toEqual([]);
    for (const locale of coverage.locales) {
      expect({ locale: locale.locale, gaps: locale.gaps }).toEqual({
        locale: locale.locale,
        gaps: [],
      });
    }
  });

  it('detects a gap when one exists', () => {
    // Same guard-the-guard reasoning: a coverage function that always returned
    // an empty list would pass the assertion above for the wrong reason.
    const gapped = webTranslationCoverage({
      ko: { demo: { hello: '안녕하세요', blank: '한 줄' } },
      en: { demo: { blank: '   ' } },
    });

    expect(gapped.missingKeys).toEqual(['demo.blank', 'demo.hello']);
    expect(gapped.locales.find((l) => l.locale === 'en')?.gaps).toEqual([
      { key: 'demo.blank', reason: 'empty' },
      { key: 'demo.hello', reason: 'missing' },
    ]);
  });
});
