/**
 * Completion artifact naming (grain-1).
 *
 * The contract under test is the one an English recipient sees in their
 * attachment list: no Korean, ever. `artifactFilename` is the single place that
 * decides that, so it is tested at its public surface rather than through the
 * pipeline that calls it.
 */

import { artifactFilename, parseArtifactKind } from './artifact';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n/locale-resolver';

/** The measure the spec pins for M-4/M-5: zero Hangul in English output. */
const HANGUL = /[가-힣]/;

describe('parseArtifactKind', () => {
  it('accepts the two known artifact kinds', () => {
    expect(parseArtifactKind('signed')).toBe('signed');
    expect(parseArtifactKind('certificate')).toBe('certificate');
  });

  it('rejects anything else, including prototype keys', () => {
    for (const value of ['', 'Signed', 'pdf', 'constructor', '__proto__', 'toString']) {
      expect(parseArtifactKind(value)).toBeNull();
    }
  });
});

describe('artifactFilename — English recipients see no Korean', () => {
  it.each(['signed', 'certificate'] as const)(
    'names the %s artifact in English when the locale is en',
    (kind) => {
      expect(artifactFilename('Service Agreement', kind, 'en')).not.toMatch(HANGUL);
    },
  );

  it('uses the English artifact labels verbatim', () => {
    expect(artifactFilename('Service Agreement', 'signed', 'en')).toBe(
      'Service Agreement (Final Contract).pdf',
    );
    expect(artifactFilename('Service Agreement', 'certificate', 'en')).toBe(
      'Service Agreement (Audit Trail Certificate).pdf',
    );
  });

  it('falls back to an English placeholder when the title is empty', () => {
    expect(artifactFilename('   ', 'signed', 'en')).toBe('Contract (Final Contract).pdf');
    expect(artifactFilename('', 'certificate', 'en')).not.toMatch(HANGUL);
  });

  it('leaves a Korean title untouched — the title is the sender\'s data, not copy', () => {
    // Only the label and the fallback are translated. A Korean-titled contract
    // sent to an English recipient keeps its real name; translating user data
    // would make the attachment unrecognisable to the sender.
    expect(artifactFilename('용역 계약서', 'signed', 'en')).toBe(
      '용역 계약서 (Final Contract).pdf',
    );
  });
});

describe('artifactFilename — Korean output is unchanged', () => {
  it('keeps the established Korean labels', () => {
    expect(artifactFilename('용역 계약서', 'signed', 'ko')).toBe(
      '용역 계약서 (최종 계약서).pdf',
    );
    expect(artifactFilename('용역 계약서', 'certificate', 'ko')).toBe(
      '용역 계약서 (감사 추적 인증서).pdf',
    );
  });

  it('falls back to the Korean placeholder for an empty title', () => {
    expect(artifactFilename('', 'signed', 'ko')).toBe('계약서 (최종 계약서).pdf');
  });
});

describe('artifactFilename — filesystem safety holds in every locale', () => {
  it.each(SUPPORTED_LOCALES)('strips path and reserved characters (%s)', (locale) => {
    const name = artifactFilename('a/b\\c:d*e?f"g<h>i|j', 'signed', locale as SupportedLocale);
    expect(name).toContain('a b c d e f g h i j');
    expect(name.slice(0, name.indexOf(' ('))).not.toMatch(/[\\/:*?"<>|]/);
  });

  it.each(SUPPORTED_LOCALES)('caps the title at 80 characters (%s)', (locale) => {
    const name = artifactFilename('x'.repeat(200), 'signed', locale as SupportedLocale);
    expect(name.startsWith('x'.repeat(80) + ' (')).toBe(true);
  });

  it.each(SUPPORTED_LOCALES)('always ends in .pdf (%s)', (locale) => {
    expect(artifactFilename('any', 'certificate', locale as SupportedLocale)).toMatch(/\.pdf$/);
  });
});
