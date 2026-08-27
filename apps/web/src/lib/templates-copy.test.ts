/**
 * Every word the templates screen can render, verified in both locales.
 *
 * The list, its dialogs, and the field-overlay preview all call `t()` directly,
 * so the sweep works from the catalog end: it renders the whole `templates`
 * domain in each locale and fails on copy that never got translated, never got
 * its slot filled, or came back blank. `templateMetaLine` is the one string the
 * screen assembles rather than reads, so it is pinned separately.
 */

import { TEMPLATES_TRANSLATIONS } from './i18n/templates';
import { templateMetaLine, type TemplateMeta } from './templates-copy';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslate,
  type WebTranslationKey,
} from './web-translations';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locale';

/** Matches any Hangul syllable, the marker of copy that never got translated. */
const HANGUL = /[가-힣]/;

/**
 * Every slot the templates domain interpolates, with a value for each. One bag
 * for the whole domain, so a key that grows a new slot fails loudly here (as an
 * unfilled `{name}`) instead of shipping a hole in a sentence.
 */
const SLOT_VALUES = {
  name: 'Standard NDA',
  count: 3,
  page: 1,
  total: 4,
  when: 'just now',
} as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const TEMPLATES_KEYS = Object.keys(TEMPLATES_TRANSLATIONS).map(
  (key) => `templates.${key}` as WebTranslationKey,
);

/** 2026-08-27T09:00:00Z, the clock every meta-line case is measured against. */
const NOW = Date.parse('2026-08-27T09:00:00.000Z');

function template(overrides: Partial<TemplateMeta> = {}): TemplateMeta {
  return {
    pageCount: 2,
    fieldCount: 3,
    createdAt: '2026-08-27T08:59:30.000Z',
    ...overrides,
  };
}

describe('the templates domain renders in every supported locale', () => {
  it.each([...SUPPORTED_LOCALES])('resolves every templates key in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = TEMPLATES_KEYS.map((key) => t(key, SLOT_VALUES));

    // A key with no copy in this locale falls back to Korean and is reported;
    // the empty report is the assertion that matters.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(rendered).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(rendered.filter((value) => value.trim() === '')).toEqual([]);
    // A slot the bag does not cover survives as a literal `{name}` on screen.
    expect(rendered.filter((value) => value.includes('{'))).toEqual([]);
  });

  it('leaves no Korean in the English templates screen', () => {
    const { t } = translatorFor('en');

    const untranslated = TEMPLATES_KEYS.filter((key) => HANGUL.test(t(key, SLOT_VALUES)));

    expect(untranslated).toEqual([]);
  });

  it('keeps the Korean wording the templates screen shipped with', () => {
    const { t } = translatorFor('ko');

    expect(t('templates.title')).toBe('내 템플릿');
    expect(t('templates.emptyTitle')).toBe('아직 저장한 템플릿이 없어요');
    expect(t('templates.start')).toBe('이 템플릿으로 시작');
  });

  it('keeps the destructive confirm about the template it names', () => {
    const { t } = translatorFor('en');

    expect(t('templates.deleteTitle', { name: 'Standard NDA' })).toContain('Standard NDA');
    // Says what is lost and what is not, without blaming anyone.
    expect(t('templates.deleteDescription')).toBe(
      'This cannot be undone. Contracts you have already sent are not affected.',
    );
  });
});

describe('the per-card meta line', () => {
  it.each([...SUPPORTED_LOCALES])('assembles without a fallback in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const line = templateMetaLine(t, template(), NOW);

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(line).not.toContain('{');
    expect(line.trim()).not.toBe('');
  });

  it('joins whole sentences with a middle dot, not sentence fragments', () => {
    const { t } = translatorFor('en');

    expect(templateMetaLine(t, template(), NOW)).toBe('Pages: 2 · Fields: 3 · Saved just now');
    expect(templateMetaLine(translatorFor('ko').t, template(), NOW)).toBe(
      '2페이지 · 필드 3개 · 방금 전 저장',
    );
  });

  it('omits a count of zero rather than reporting nothing as something', () => {
    const { t } = translatorFor('en');

    expect(templateMetaLine(t, template({ fieldCount: 0 }), NOW)).toBe('Pages: 2 · Saved just now');
    expect(templateMetaLine(t, template({ pageCount: 0 }), NOW)).toBe('Fields: 3 · Saved just now');
  });

  it('drops the timestamp rather than guessing at an unparseable one', () => {
    const { t } = translatorFor('en');

    expect(templateMetaLine(t, template({ createdAt: 'not-a-date' }), NOW)).toBe(
      'Pages: 2 · Fields: 3',
    );
  });
});
