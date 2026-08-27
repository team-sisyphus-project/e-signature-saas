/**
 * Every word the settings section can render, verified in both locales.
 *
 * The settings screens call `t()` directly, so the sweep works from the catalog
 * end: it renders the whole `settings` domain in each locale and fails on copy
 * that never got translated, never got its slot filled, or came back blank. The
 * two places that decide *which* key a screen asks for — the branding image
 * guards and the settings menu — are pinned separately.
 */

import { SETTINGS_TRANSLATIONS } from './i18n/settings';
import {
  IMAGE_GUARD_KEYS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  validateImageFile,
  type ValidatedFile,
} from './image-validation';
import { SETTINGS_DEFAULT_ROUTE, settingsNavItems } from './settings-copy';
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
 * Every slot the settings domain interpolates, with a value for each. One bag
 * for the whole domain, so a key that grows a new slot fails loudly here (as an
 * unfilled `{name}`) instead of shipping a hole in a sentence.
 */
const SLOT_VALUES = {
  limit: MAX_IMAGE_MB,
  label: 'Logo',
  product: 'eSign',
} as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const SETTINGS_KEYS = Object.keys(SETTINGS_TRANSLATIONS).map(
  (key) => `settings.${key}` as WebTranslationKey,
);

function imageFile(overrides: Partial<ValidatedFile> = {}): ValidatedFile {
  return { name: 'logo.png', type: 'image/png', size: 10 * 1024, ...overrides };
}

describe('the settings domain renders in every supported locale', () => {
  it.each([...SUPPORTED_LOCALES])('resolves every settings key in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = SETTINGS_KEYS.map((key) => t(key, SLOT_VALUES));

    // A key with no copy in this locale falls back to Korean and is reported;
    // the empty report is the assertion that matters.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(rendered).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(rendered.filter((value) => value.trim() === '')).toEqual([]);
    // A slot the bag does not cover survives as a literal `{name}` on screen.
    expect(rendered.filter((value) => value.includes('{'))).toEqual([]);
  });

  it('leaves no Korean in the English settings section', () => {
    const { t } = translatorFor('en');

    // The language picker names each language in its own language on purpose,
    // so a reader stranded in the wrong locale can still find their way back.
    const untranslated = SETTINGS_KEYS.filter(
      (key) => key !== 'settings.korean' && HANGUL.test(t(key, SLOT_VALUES)),
    );

    expect(untranslated).toEqual([]);
  });

  it('keeps the Korean wording the settings section shipped with', () => {
    const { t } = translatorFor('ko');

    expect(t('settings.title')).toBe('설정');
    expect(t('settings.brandingTitle')).toBe('브랜딩');
    expect(t('settings.colorLabel')).toBe('대표 색상');
    expect(t('settings.logout')).toBe('로그아웃');
  });

  it('separates the branding save from the language save', () => {
    const { t } = translatorFor('en');

    // Two buttons, two sentences: one persists a form, the other commits a
    // single preference. Sharing a key would make renaming one rename both.
    expect(t('settings.brandingSave')).toBe('Save');
    expect(t('settings.save')).toBe('Save changes');
  });
});

describe('branding image guards', () => {
  it('accepts an SVG or PNG within the size cap', () => {
    expect(validateImageFile(imageFile({ name: 'logo.svg', type: 'image/svg+xml' }))).toBeNull();
    expect(validateImageFile(imageFile({ size: MAX_IMAGE_BYTES }))).toBeNull();
  });

  it('names which rule a rejected file trips rather than a sentence', () => {
    expect(validateImageFile(imageFile({ name: 'photo.jpg', type: 'image/jpeg' }))).toBe(
      'settings.imageInvalidType',
    );
    expect(validateImageFile(imageFile({ size: 0 }))).toBe('settings.imageEmpty');
    expect(validateImageFile(imageFile({ size: MAX_IMAGE_BYTES + 1 }))).toBe(
      'settings.imageTooLarge',
    );
  });

  it.each([...SUPPORTED_LOCALES])('resolves every guard message in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const messages = Object.values(IMAGE_GUARD_KEYS).map((key) =>
      t(key, { limit: MAX_IMAGE_MB }),
    );

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(messages.filter((message) => message.trim() === '')).toEqual([]);
  });

  it('quotes the enforced cap, not a second number that could drift', () => {
    const { t } = translatorFor('en');

    expect(t('settings.imageTooLarge', { limit: MAX_IMAGE_MB })).toContain(`${MAX_IMAGE_MB}MB`);
    expect(t('settings.imageHint', { limit: MAX_IMAGE_MB })).toContain(`${MAX_IMAGE_MB}MB`);
    expect(MAX_IMAGE_BYTES).toBe(MAX_IMAGE_MB * 1024 * 1024);
  });

  it('names the fix rather than the reader’s mistake', () => {
    const { t } = translatorFor('en');

    expect(t('settings.imageEmpty')).toBe('That file is empty. Try another file.');
  });
});

describe('settings menu', () => {
  it.each([...SUPPORTED_LOCALES])('labels every sub-section in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const items = settingsNavItems(t);

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(items.map((item) => item.href)).toEqual(['/settings/branding', '/settings/language']);
    expect(items.filter((item) => item.label.trim() === '')).toEqual([]);
  });

  it('translates the menu without touching the routes', () => {
    expect(settingsNavItems(translatorFor('ko').t).map((item) => item.label)).toEqual([
      '브랜딩',
      '언어',
    ]);
    expect(settingsNavItems(translatorFor('en').t).map((item) => item.label)).toEqual([
      'Branding',
      'Language',
    ]);
  });

  it('lands `/settings` on a sub-section that actually exists', () => {
    const routes = settingsNavItems(translatorFor('ko').t).map((item) => item.href);

    expect(routes).toContain(SETTINGS_DEFAULT_ROUTE);
  });
});
