/**
 * Every word the sender's contract-detail and share-link surfaces can render,
 * verified in both locales — plus the pure helpers those surfaces bind to.
 *
 * The screens call `t()` directly, so the copy sweep works from the catalog end:
 * it renders the whole `contracts` domain in each locale and fails on copy that
 * never got translated, never got its slot filled, or came back blank.
 *
 * The helpers are pinned separately because they are the decisions the screens
 * cannot re-derive: which key each password state maps to, which value the
 * editor field opens with, and how an expiry deadline is written for a reader.
 * DOM behavior isn't tested here (no jsdom for component tests).
 */

import { CONTRACTS_TRANSLATIONS } from './i18n/contracts';
import {
  EXPIRY_PRESETS,
  DEFAULT_EXPIRY_PRESET_KEY,
  expiryInput,
  expiryNote,
  findExpiryPreset,
  formatExpiryDate,
  passwordEditorInitialValue,
  passwordStateHint,
  passwordTriggerLabel,
  shareLinkStateLabel,
  SHARE_PASSWORD_MIN_LENGTH,
  type ShareLinkPasswordView,
  type ShareLinkState,
} from './sharing';
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
 * Every slot the contracts domain interpolates, with a value for each. One bag
 * for the whole domain, so a key that grows a new slot fails loudly here (as an
 * unfilled `{name}`) instead of shipping a hole in a sentence.
 */
const SLOT_VALUES = {
  count: 3,
  label: 'Share link',
  date: 'July 3, 2026',
} as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const CONTRACTS_KEYS = Object.keys(CONTRACTS_TRANSLATIONS).map(
  (key) => `contracts.${key}` as WebTranslationKey,
);

const NONE: ShareLinkPasswordView = { hasPassword: false, recoverable: false, password: null };
const CONFIRMABLE: ShareLinkPasswordView = {
  hasPassword: true,
  recoverable: true,
  password: 'hunter2',
};
const LEGACY: ShareLinkPasswordView = { hasPassword: true, recoverable: false, password: null };

/** Noon KST on 3 July 2026 — far enough from midnight that the zone is not the subject. */
const EXPIRY_ISO = '2026-07-03T03:00:00.000Z';

describe('the contracts domain renders in every supported locale', () => {
  it.each([...SUPPORTED_LOCALES])('resolves every contracts key in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = CONTRACTS_KEYS.map((key) => t(key, SLOT_VALUES));

    // A key with no copy in this locale falls back to Korean and is reported;
    // the empty report is the assertion that matters.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(rendered).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(rendered.filter((value) => value.trim() === '')).toEqual([]);
    // A slot the bag does not cover survives as a literal `{name}` on screen.
    expect(rendered.filter((value) => value.includes('{'))).toEqual([]);
  });

  it('leaves no Korean in the English contract detail', () => {
    const { t } = translatorFor('en');

    const untranslated = CONTRACTS_KEYS.filter((key) => HANGUL.test(t(key, SLOT_VALUES)));

    expect(untranslated).toEqual([]);
  });

  it('keeps the Korean wording the detail screen shipped with', () => {
    const { t } = translatorFor('ko');

    expect(t('contracts.shareTitle')).toBe('공유 링크');
    expect(t('contracts.shareCreate')).toBe('링크로 공유');
    expect(t('contracts.linkDialogTitle')).toBe('링크로 공유하기');
  });

  it('names the number in Korean and lets the term carry the noun in English', () => {
    // The `dt` beside these values already says "Recipients" / "Pages", so the
    // English value repeating the noun would read as a stutter.
    expect(translatorFor('ko').t('contracts.summaryRecipientCount', { count: 3 })).toBe('3명');
    expect(translatorFor('en').t('contracts.summaryRecipientCount', { count: 3 })).toBe('3');
    expect(translatorFor('ko').t('contracts.summaryPageCount', { count: 12 })).toBe('12페이지');
    expect(translatorFor('en').t('contracts.summaryPageCount', { count: 12 })).toBe('12');
  });

  it('states the password minimum as a number, not as a hardcoded word', () => {
    const { t } = translatorFor('en');

    expect(t('contracts.linkPasswordTooShort', { count: SHARE_PASSWORD_MIN_LENGTH })).toBe(
      'Use at least 4 characters.',
    );
  });

  it('names an accessible action after the link it acts on', () => {
    const { t } = translatorFor('en');

    expect(t('contracts.linkRevokeLabel', { label: 'Client NDA' })).toBe(
      'Disable the Client NDA link',
    );
    expect(t('contracts.linkPasswordManageLabel', { label: 'Client NDA' })).toBe(
      'Manage the password for the Client NDA link',
    );
  });
});

describe('validity presets', () => {
  it('carries a catalog key per option, never a word', () => {
    for (const preset of EXPIRY_PRESETS) {
      expect(preset.labelKey.startsWith('contracts.')).toBe(true);
      expect(HANGUL.test(preset.labelKey)).toBe(false);
    }
  });

  it.each([...SUPPORTED_LOCALES])('renders every option in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const labels = EXPIRY_PRESETS.map((preset) => t(preset.labelKey));

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(new Set(labels).size).toBe(EXPIRY_PRESETS.length);
  });

  it('reads the same windows in both locales', () => {
    const ko = EXPIRY_PRESETS.map((preset) => translatorFor('ko').t(preset.labelKey));
    const en = EXPIRY_PRESETS.map((preset) => translatorFor('en').t(preset.labelKey));

    expect(ko).toEqual(['1일', '3일', '1주일', '1개월', '만료 없음']);
    expect(en).toEqual(['1 day', '3 days', '1 week', '1 month', 'No expiry']);
  });

  it('falls back to the one-week default for an unknown key', () => {
    expect(findExpiryPreset('nope').key).toBe(DEFAULT_EXPIRY_PRESET_KEY);
    expect(findExpiryPreset('3d').days).toBe(3);
  });

  it('maps a windowless preset to noExpiry rather than to zero days', () => {
    expect(expiryInput(findExpiryPreset('none'))).toEqual({ noExpiry: true });
    expect(expiryInput(findExpiryPreset('1m'))).toEqual({ expiresInDays: 30 });
  });
});

describe('expiry dates', () => {
  it('writes the deadline the way the reader’s language writes dates', () => {
    expect(formatExpiryDate(EXPIRY_ISO, 'ko')).toBe('2026년 7월 3일');
    expect(formatExpiryDate(EXPIRY_ISO, 'en')).toBe('July 3, 2026');
  });

  it('names the same day in both locales, whatever the reader’s clock says', () => {
    // 23:30 KST: a zone-naive formatter would call this July 2nd for a reader
    // west of Seoul, and a link would appear to die a day early.
    const lateNight = '2026-07-03T14:30:00.000Z';

    expect(formatExpiryDate(lateNight, 'ko')).toBe('2026년 7월 3일');
    expect(formatExpiryDate(lateNight, 'en')).toBe('July 3, 2026');
  });

  it.each([...SUPPORTED_LOCALES])('states a deadline as a whole sentence in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const note = expiryNote(t, locale, { expiresAt: EXPIRY_ISO });

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(note).not.toContain('{');
    expect(note).toContain(formatExpiryDate(EXPIRY_ISO, locale));
  });

  it('says a link never expires rather than leaving the date out', () => {
    expect(expiryNote(translatorFor('en').t, 'en', { expiresAt: null })).toBe(
      'Stays open with no expiry.',
    );
    expect(expiryNote(translatorFor('ko').t, 'ko', { expiresAt: null })).toBe(
      '만료 없이 계속 열 수 있어요.',
    );
  });
});

describe('lifecycle state labels', () => {
  const states: ShareLinkState[] = ['active', 'expired', 'revoked', 'completed'];

  it.each([...SUPPORTED_LOCALES])('labels every state in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const labels = states.map((state) => shareLinkStateLabel(t, state));

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(new Set(labels).size).toBe(states.length);
  });

  it('uses the same word for the state and the action that causes it', () => {
    const { t } = translatorFor('en');

    // A row disabled by its owner reads "Disabled" beside a "Disable" button.
    expect(shareLinkStateLabel(t, 'revoked')).toBe('Disabled');
    expect(t('contracts.linkRevoke')).toBe('Disable');
  });
});

describe('passwordTriggerLabel', () => {
  it.each([...SUPPORTED_LOCALES])('offers view vs set in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    expect(passwordTriggerLabel(t, true)).toBe(t('contracts.linkPasswordOpen'));
    expect(passwordTriggerLabel(t, false)).toBe(t('contracts.linkPasswordSet'));
    expect(runtime.getFallbackReport().entries).toEqual([]);
  });

  it('distinguishes the two in English', () => {
    const { t } = translatorFor('en');

    expect(passwordTriggerLabel(t, true)).toBe('View password');
    expect(passwordTriggerLabel(t, false)).toBe('Set password');
  });
});

describe('passwordStateHint', () => {
  it.each([...SUPPORTED_LOCALES])('maps each semantic state to its hint in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    expect(passwordStateHint(t, NONE)).toBe(t('contracts.linkPasswordHintNone'));
    // A confirmable password is explained with the same sentence the create
    // dialog uses: same fact, same reader, told at the two moments it is set.
    expect(passwordStateHint(t, CONFIRMABLE)).toBe(t('contracts.linkPasswordHint'));
    expect(passwordStateHint(t, LEGACY)).toBe(t('contracts.linkPasswordHintLegacy'));
    expect(runtime.getFallbackReport().entries).toEqual([]);
  });

  it('tells an owner what to do next about a password it cannot show', () => {
    const { t } = translatorFor('en');

    expect(passwordStateHint(t, LEGACY)).toBe(
      'The password set earlier cannot be shown. Set a new one to make it viewable again.',
    );
  });
});

describe('passwordEditorInitialValue', () => {
  it('pre-fills only the confirmable plaintext; empty otherwise', () => {
    expect(passwordEditorInitialValue(CONFIRMABLE)).toBe('hunter2');
    expect(passwordEditorInitialValue(NONE)).toBe('');
    // Legacy: a hash we cannot show — start empty so the owner types a new one.
    expect(passwordEditorInitialValue(LEGACY)).toBe('');
  });
});
