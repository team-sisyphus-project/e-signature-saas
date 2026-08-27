/**
 * Every word the two public (never-logged-in) flows can render, in both locales.
 *
 * The signing link and the share link are the only screens whose language is
 * chosen for the reader rather than by them, so an untranslated key here is
 * invisible to the person who could report it. The sweep therefore works from
 * the catalog end: it renders the whole `signer` and `share` domains in each
 * locale and fails on copy that never got translated, never got its slot
 * filled, or came back blank.
 *
 * The second half pins the indirection the flows actually run on: both
 * `FillCopy` maps must name keys that exist, in both locales — that is what
 * makes the shared viewer / capture sheet / completion takeover safe to feed
 * from two different state machines.
 */

import { COMPLETION_ARTIFACT_KEYS } from './completion-download';
import { SIGNER_FILL_COPY, SHARE_FILL_COPY, type FillCopy } from './fill-copy';
import { SIGNER_TRANSLATIONS } from './i18n/signer';
import { SHARE_TRANSLATIONS } from './i18n/share';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locale';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslate,
  type WebTranslationKey,
} from './web-translations';

/** Matches any Hangul syllable, the marker of copy that never got translated. */
const HANGUL = /[가-힣]/;

/**
 * Every slot the two domains interpolate, with a value for each. One bag for
 * both, so a key that grows a new slot fails loudly here (as an unfilled
 * `{name}`) instead of shipping a hole in a sentence.
 */
const SLOT_VALUES = {
  page: 2,
  total: 3,
  done: 1,
  label: 'Signature',
  name: 'Acme',
} as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const DOMAINS = {
  signer: Object.keys(SIGNER_TRANSLATIONS).map((key) => `signer.${key}` as WebTranslationKey),
  share: Object.keys(SHARE_TRANSLATIONS).map((key) => `share.${key}` as WebTranslationKey),
};

/** Flatten a flow's copy map to the keys it will ask the catalog for. */
function keysOf(copy: FillCopy): WebTranslationKey[] {
  return [
    copy.ctaContinue,
    copy.ctaComplete,
    copy.loadError,
    copy.pageError,
    copy.progress,
    copy.progressNone,
    copy.progressAllDone,
    copy.completeError,
    ...Object.values(copy.fieldAffordance),
    ...Object.values(copy.sheet.title),
    ...Object.values(copy.sheet.hint),
    copy.sheet.modeDraw,
    copy.sheet.modeType,
    copy.sheet.modeLabel,
    copy.sheet.padLabel,
    copy.sheet.typeHint,
    copy.sheet.typePlaceholder,
    copy.sheet.fontLabel,
    copy.sheet.dateLabel,
    copy.sheet.textLabel,
    copy.sheet.textPlaceholder,
    copy.sheet.reset,
    copy.sheet.apply,
    copy.sheet.close,
    copy.sheet.saveError,
    ...Object.values(copy.done),
  ];
}

describe.each(SUPPORTED_LOCALES)('the public flows render in %s', (locale) => {
  it.each(Object.entries(DOMAINS))('resolves every %s key', (_domain, keys) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = keys.map((key) => [key, t(key, SLOT_VALUES)] as const);

    // A key with no copy in this locale silently borrows Korean; the report is
    // where that shows up, so assert on it rather than on the rendered string.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    for (const [key, copy] of rendered) {
      expect(`${key}: ${copy}`).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
      expect(copy.trim()).not.toBe('');
      // A leftover `{slot}` means the sentence has a hole in it.
      expect(`${key}: ${copy}`).not.toMatch(/\{\w+\}/);
    }
  });

  it.each([
    ['signer', SIGNER_FILL_COPY],
    ['share', SHARE_FILL_COPY],
  ])('resolves every key the %s flow feeds the shared fill surface', (_flow, copy) => {
    const { t, runtime } = translatorFor(locale);

    for (const key of keysOf(copy)) {
      expect(t(key, SLOT_VALUES).trim()).not.toBe('');
    }

    expect(runtime.getFallbackReport().missingKeys).toEqual([]);
  });
});

describe('English copy for a reader who never chose the language', () => {
  it('leaves no Korean anywhere in the signing or share flow', () => {
    const { t } = translatorFor('en');

    const korean = [...DOMAINS.signer, ...DOMAINS.share]
      .map((key) => [key, t(key, SLOT_VALUES)] as const)
      .filter(([, copy]) => HANGUL.test(copy))
      .map(([key]) => key);

    expect(korean).toEqual([]);
  });

  it('carries the verification gate through to completion', () => {
    const { t } = translatorFor('en');

    expect(t('signer.verifyTitle')).toBe('Verify your identity');
    expect(t('signer.viewerCtaContinue')).toBe('Sign');
    expect(t('signer.fieldAffordanceSignature')).toBe('Sign here');
    expect(t('signer.sheetApply')).toBe('Apply');
    expect(t('signer.doneTitle')).toBe('Signing complete');
    expect(t('signer.doneNextAllDone')).toBe(
      'All signatures are complete. We will email the completed contract.',
    );
  });

  it('words the recipient flow for filling and submitting, not signing', () => {
    const { t } = translatorFor('en');

    expect(t('share.gateTitle')).toBe('Enter the password');
    expect(t('share.viewerCtaComplete')).toBe('Submit');
    expect(t('share.doneTitle')).toBe('Submission complete');
    expect(t('share.noticeExpiredTitle')).toBe('This link has expired');
  });

  it('labels the signer completion download in English', () => {
    const { t } = translatorFor('en');

    expect(t('common.completionTitle')).toBe('Completed documents');
    expect(t(COMPLETION_ARTIFACT_KEYS.signed.title)).toBe('Signed contract');
    expect(t(COMPLETION_ARTIFACT_KEYS.certificate.title)).toBe('Audit trail certificate');
    expect(t('common.completionDownload')).toBe('Download');
  });
});

describe('progress and page lines keep their counts in the reader’s word order', () => {
  it.each([
    ['ko', 'signer.viewerProgress', '서명할 항목 3곳 중 1곳을 작성했어요.'],
    ['en', 'signer.viewerProgress', 'Completed 1 of 3 signing fields.'],
    ['ko', 'share.viewerProgress', '작성할 항목 3곳 중 1곳을 작성했어요.'],
    ['en', 'share.viewerProgress', 'Completed 1 of 3 fields.'],
    ['ko', 'signer.viewerPageError', '2페이지를 불러올 수 없어요.'],
    ['en', 'signer.viewerPageError', 'We could not load page 2.'],
    ['ko', 'signer.viewerPageLabel', '계약 2페이지'],
    ['en', 'signer.viewerPageLabel', 'Contract page 2'],
  ] as const)('renders %s %s', (locale, key, expected) => {
    const { t } = translatorFor(locale);
    expect(t(key, SLOT_VALUES)).toBe(expected);
  });
});

describe('the two flows share one surface without duplicating its copy', () => {
  it('reuses the signer capture sheet verbatim, apart from the type hints', () => {
    // The sheet is one component seen by both audiences: copying its strings
    // into `share` is how the two would drift apart a release later.
    expect(SHARE_FILL_COPY.sheet.apply).toBe(SIGNER_FILL_COPY.sheet.apply);
    expect(SHARE_FILL_COPY.fieldAffordance).toEqual(SIGNER_FILL_COPY.fieldAffordance);
    expect(SHARE_FILL_COPY.sheet.hint.DATE).not.toBe(SIGNER_FILL_COPY.sheet.hint.DATE);
  });

  it('says the same next step to a recipient whether or not others are pending', () => {
    // A fill link hands nothing back, so "who else is still pending" is not the
    // recipient's concern — unlike a signer, who is waiting for a document.
    expect(SHARE_FILL_COPY.done.nextAllDone).toBe(SHARE_FILL_COPY.done.nextWaiting);
    expect(SIGNER_FILL_COPY.done.nextAllDone).not.toBe(SIGNER_FILL_COPY.done.nextWaiting);
  });
});
