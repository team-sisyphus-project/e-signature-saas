/**
 * The auth screens and the chrome every other screen borrows, in both locales.
 *
 * Two things are pinned here. The first is the usual whole-domain sweep: the
 * `auth` and `common` domains render in ko and en with no untranslated
 * fallback, no leftover `{slot}`, and no blank string.
 *
 * The second is the indirection this grain introduced. Three modules that run
 * outside React — the API client, the Google popup flow, the PDF loader — used
 * to carry Korean sentences because they had nowhere else to put them. They now
 * carry *keys*, and the screens resolve them. That swap is only safe if every
 * key those modules name actually exists, which is exactly what a compiler
 * cannot check for a `WebTranslationKey` (it is a template-literal type, not a
 * closed union). So the tests below name them.
 */

import { GENERIC_ERROR_KEY, ApiError, apiErrorMessage } from './api';
import { COMPLETION_ARTIFACT_KEYS } from './completion-download';
import { GOOGLE_AUTH_ERROR_KEYS, GoogleAuthError, googleFailureMessage } from './google-oauth';
import { AUTH_TRANSLATIONS } from './i18n/auth';
import { COMMON_TRANSLATIONS } from './i18n/common';
import { PDF_READ_ERROR_KEY } from './pdf';
import { SIGNATURE_FONTS } from './signature';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locale';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslate,
  type WebTranslationKey,
} from './web-translations';

/** Matches any Hangul syllable, the marker of copy that never got translated. */
const HANGUL = /[가-힣]/;

/** Every slot the two domains interpolate. `min` is the password minimum. */
const SLOT_VALUES = { min: 8, completedAt: '2026.08.27 14:30 (KST)' } as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const DOMAINS = {
  auth: Object.keys(AUTH_TRANSLATIONS).map((key) => `auth.${key}` as WebTranslationKey),
  common: Object.keys(COMMON_TRANSLATIONS).map((key) => `common.${key}` as WebTranslationKey),
};

describe.each(SUPPORTED_LOCALES)('auth and common copy in %s', (locale) => {
  it.each(Object.entries(DOMAINS))('renders every %s key', (_domain, keys) => {
    const { t, runtime } = translatorFor(locale);
    const blank: string[] = [];
    const unresolved: string[] = [];

    for (const key of keys) {
      const rendered = t(key, SLOT_VALUES);
      if (!rendered.trim() || rendered === UNKNOWN_WEB_TRANSLATION_FALLBACK) blank.push(key);
      if (/\{\w+\}/.test(rendered)) unresolved.push(`${key} → ${rendered}`);
    }

    expect(blank).toEqual([]);
    expect(unresolved).toEqual([]);
    expect(runtime.getFallbackReport().missingKeys).toEqual([]);
  });

  it.each(Object.entries(DOMAINS))('keeps no Korean in the English %s copy', (_domain, keys) => {
    if (locale !== 'en') return;
    const { t } = translatorFor('en');

    expect(keys.filter((key) => HANGUL.test(t(key, SLOT_VALUES)))).toEqual([]);
  });
});

describe('English auth voice', () => {
  const { t } = translatorFor('en');

  it('rewrites the sign-up screen rather than transliterating it', () => {
    expect(t('auth.signupTitle')).toBe('Get started');
    expect(t('auth.signupSubmit')).toBe('Create account');
    expect(t('auth.signingUp')).toBe('Creating account');
  });

  it('states the next action instead of naming the mistake', () => {
    expect(t('auth.passwordMismatch')).toBe('The passwords do not match. Check them again.');
    expect(t('auth.termsRequired')).toBe('Agree to the terms to create an account.');
  });

  it('drops the Korean exclamation mark from the success beat', () => {
    expect(t('auth.signupSuccessTitle')).toBe('Account created');
    // Korean keeps its own voice — the ban is an English-side rule.
    expect(translatorFor('ko').t('auth.signupSuccessTitle')).toBe('가입이 완료되었습니다!');
  });

  it('carries the password minimum as a slot, not a spliced fragment', () => {
    expect(t('auth.passwordHint', { min: 8 })).toBe('Use at least 8 characters.');
    expect(translatorFor('ko').t('auth.passwordHint', { min: 8 })).toBe('8자 이상 입력해 주세요.');
  });
});

describe('copy that non-React modules only name', () => {
  it.each(SUPPORTED_LOCALES)('resolves every named key in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);
    const keys: WebTranslationKey[] = [
      GENERIC_ERROR_KEY,
      PDF_READ_ERROR_KEY,
      ...Object.values(GOOGLE_AUTH_ERROR_KEYS),
      ...SIGNATURE_FONTS.map((font) => font.labelKey),
      ...Object.values(COMPLETION_ARTIFACT_KEYS).flatMap((item) => [item.title, item.description]),
    ];

    for (const key of keys) expect(t(key).trim()).not.toBe('');
    expect(runtime.getFallbackReport().missingKeys).toEqual([]);
  });
});

describe('apiErrorMessage', () => {
  const { t } = translatorFor('en');

  it('prefers the server sentence, which is already localized server-side', () => {
    const error = new ApiError('That email is already registered.', 409);

    expect(apiErrorMessage(t, error)).toBe('That email is already registered.');
  });

  it('localizes the fallback when the client synthesized the failure', () => {
    // A network drop never reached the server, so there is no server copy to
    // show — and before this grain the fallback was a Korean literal.
    expect(apiErrorMessage(t, new ApiError(null, 0))).toBe(
      'Something went wrong. Please try again shortly.',
    );
    expect(apiErrorMessage(t, new ApiError(null, 0), 'dashboard.loadError')).toBe(
      t('dashboard.loadError'),
    );
  });

  it('never renders the developer-facing Error message', () => {
    const synthesized = new ApiError(null, 500);

    expect(synthesized.message).not.toBe(apiErrorMessage(t, synthesized));
    expect(apiErrorMessage(t, new Error('TypeError: fetch failed'))).toBe(
      'Something went wrong. Please try again shortly.',
    );
  });

  it('treats a blank server message as no message at all', () => {
    expect(apiErrorMessage(t, new ApiError('   ', 400))).toBe(
      'Something went wrong. Please try again shortly.',
    );
  });

  // The contract every render site depends on: `ApiError.message` is a developer
  // string (`Request failed (network)`) whenever the server sent no copy of its
  // own, so no screen may read it. Resolving through this helper is the only way
  // a synthesized failure reaches a reader in their own language.
  it('never lets the synthesized message shape reach a caller', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { t: translate } = translatorFor(locale);
      for (const status of [0, 500]) {
        const error = new ApiError(null, status);
        expect(error.message).toMatch(/Request failed/);
        expect(apiErrorMessage(translate, error)).not.toMatch(/Request failed/);
        expect(apiErrorMessage(translate, error, 'signer.genericError')).not.toMatch(
          /Request failed/,
        );
      }
    }
  });
});

describe('googleFailureMessage', () => {
  it.each(['cancelled', 'popup_blocked', 'connect'] as const)(
    'names the %s failure from the catalog',
    (kind) => {
      const { t } = translatorFor('en');

      expect(googleFailureMessage(t, new GoogleAuthError(kind))).toBe(
        t(GOOGLE_AUTH_ERROR_KEYS[kind]),
      );
      expect(googleFailureMessage(t, new GoogleAuthError(kind))).not.toMatch(HANGUL);
    },
  );

  it('falls through to the API path for anything that reached our server', () => {
    const { t } = translatorFor('en');

    expect(googleFailureMessage(t, new ApiError('This Google account is not linked.', 400))).toBe(
      'This Google account is not linked.',
    );
  });
});
