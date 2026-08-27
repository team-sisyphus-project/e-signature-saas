import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
} from './web-translations';

describe('web translation fallback runtime', () => {
  it('uses English base copy and reports a missing Korean key without exposing the key', () => {
    const runtime = createWebTranslationRuntime({
      en: { auth: { welcome: 'en-welcome' } },
      ko: { auth: {} },
    });

    expect(runtime.translate('ko', 'auth.welcome')).toBe('en-welcome');
    expect(runtime.translate('ko', 'auth.welcome')).toBe('en-welcome');
    expect(runtime.getFallbackReport()).toEqual({
      missingKeys: ['auth.welcome'],
      entries: [{
        key: 'auth.welcome',
        requestedLocale: 'ko',
        fallbackLocale: 'en',
        reason: 'missing',
        count: 2,
      }],
    });
  });

  it('treats empty Korean values as missing and never returns a key or blank value', () => {
    const runtime = createWebTranslationRuntime({
      en: { auth: { welcome: 'en-welcome' } },
      ko: { auth: { welcome: '   ' } },
    });

    expect(runtime.translate('ko', 'auth.welcome')).toBe('en-welcome');
    expect(runtime.translate('ko', 'auth.unknown')).toBe(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(runtime.getFallbackReport().entries).toEqual([
      {
        key: 'auth.welcome',
        requestedLocale: 'ko',
        fallbackLocale: 'en',
        reason: 'empty',
        count: 1,
      },
      {
        key: 'auth.unknown',
        requestedLocale: 'ko',
        fallbackLocale: 'en',
        reason: 'missing',
        count: 1,
      },
    ]);
  });

  it('keeps the key list de-duplicated while retaining per-request-locale diagnostics', () => {
    const runtime = createWebTranslationRuntime({
      en: { auth: {} },
      ko: { auth: {} },
    });

    runtime.translate('ko', 'auth.welcome');
    runtime.translate('ko', 'auth.welcome');
    runtime.translate('en', 'auth.welcome');

    expect(runtime.getFallbackReport()).toEqual({
      missingKeys: ['auth.welcome'],
      entries: [
        {
          key: 'auth.welcome',
          requestedLocale: 'ko',
          fallbackLocale: 'en',
          reason: 'missing',
          count: 2,
        },
        {
          key: 'auth.welcome',
          requestedLocale: 'en',
          fallbackLocale: 'en',
          reason: 'missing',
          count: 1,
        },
      ],
    });
  });
});
