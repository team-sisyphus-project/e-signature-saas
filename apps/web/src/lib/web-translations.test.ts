import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
} from './web-translations';

describe('web translation fallback runtime', () => {
  it('uses Korean base copy and reports a missing English key without exposing the key', () => {
    const runtime = createWebTranslationRuntime({
      ko: { auth: { welcome: '환영합니다' } },
      en: { auth: {} },
    });

    expect(runtime.translate('en', 'auth.welcome')).toBe('환영합니다');
    expect(runtime.translate('en', 'auth.welcome')).toBe('환영합니다');
    expect(runtime.getFallbackReport()).toEqual({
      missingKeys: ['auth.welcome'],
      entries: [{
        key: 'auth.welcome',
        requestedLocale: 'en',
        fallbackLocale: 'ko',
        reason: 'missing',
        count: 2,
      }],
    });
  });

  it('treats empty English values as missing and never returns a key or blank value', () => {
    const runtime = createWebTranslationRuntime({
      ko: { auth: { welcome: '환영합니다' } },
      en: { auth: { welcome: '   ' } },
    });

    expect(runtime.translate('en', 'auth.welcome')).toBe('환영합니다');
    expect(runtime.translate('en', 'auth.unknown')).toBe(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(runtime.getFallbackReport().entries).toEqual([
      {
        key: 'auth.welcome',
        requestedLocale: 'en',
        fallbackLocale: 'ko',
        reason: 'empty',
        count: 1,
      },
      {
        key: 'auth.unknown',
        requestedLocale: 'en',
        fallbackLocale: 'ko',
        reason: 'missing',
        count: 1,
      },
    ]);
  });

  it('keeps the key list de-duplicated while retaining per-request-locale diagnostics', () => {
    const runtime = createWebTranslationRuntime({
      ko: { auth: {} },
      en: { auth: {} },
    });

    runtime.translate('en', 'auth.welcome');
    runtime.translate('en', 'auth.welcome');
    runtime.translate('ko', 'auth.welcome');

    expect(runtime.getFallbackReport()).toEqual({
      missingKeys: ['auth.welcome'],
      entries: [
        {
          key: 'auth.welcome',
          requestedLocale: 'en',
          fallbackLocale: 'ko',
          reason: 'missing',
          count: 2,
        },
        {
          key: 'auth.welcome',
          requestedLocale: 'ko',
          fallbackLocale: 'ko',
          reason: 'missing',
          count: 1,
        },
      ],
    });
  });
});

describe('web translation interpolation', () => {
  const catalogs = {
    ko: {
      dashboard: {
        pending: '서명 대기 {count}건',
        greeting: '{name}님, {count}건의 계약이 기다리고 있어요',
        plain: '계약',
        inherited: '{constructor}',
      },
    },
    en: {
      dashboard: {
        pending: '{count} awaiting signature',
        greeting: '{name}, you have {count} contracts waiting',
        plain: 'Contracts',
        inherited: '{constructor}',
      },
    },
  };

  it('substitutes named parameters into the requested locale copy', () => {
    const runtime = createWebTranslationRuntime(catalogs);

    expect(runtime.translate('en', 'dashboard.pending', { count: 3 })).toBe('3 awaiting signature');
    expect(runtime.translate('ko', 'dashboard.pending', { count: 3 })).toBe('서명 대기 3건');
  });

  it('fills every slot of a multi-parameter sentence, in the order the locale needs', () => {
    const runtime = createWebTranslationRuntime(catalogs);

    expect(runtime.translate('en', 'dashboard.greeting', { name: 'Ada', count: 2 })).toBe(
      'Ada, you have 2 contracts waiting',
    );
    expect(runtime.translate('ko', 'dashboard.greeting', { name: '아다', count: 2 })).toBe(
      '아다님, 2건의 계약이 기다리고 있어요',
    );
  });

  it('interpolates the Korean fallback copy when the localized entry is missing', () => {
    const runtime = createWebTranslationRuntime({
      ko: { dashboard: { pending: '서명 대기 {count}건' } },
      en: { dashboard: {} },
    });

    expect(runtime.translate('en', 'dashboard.pending', { count: 5 })).toBe('서명 대기 5건');
    expect(runtime.getFallbackReport().missingKeys).toEqual(['dashboard.pending']);
  });

  it('leaves copy without slots untouched and ignores unused parameters', () => {
    const runtime = createWebTranslationRuntime(catalogs);

    expect(runtime.translate('en', 'dashboard.plain', { count: 7 })).toBe('Contracts');
    expect(runtime.getFallbackReport().entries).toEqual([]);
  });

  it('keeps an unsupplied slot literal and reports it apart from the missing-key list', () => {
    const runtime = createWebTranslationRuntime(catalogs);

    expect(runtime.translate('en', 'dashboard.pending')).toBe('{count} awaiting signature');
    expect(runtime.translate('en', 'dashboard.pending', {})).toBe('{count} awaiting signature');

    const report = runtime.getFallbackReport();
    expect(report.missingKeys).toEqual([]);
    expect(report.entries).toEqual([
      {
        key: 'dashboard.pending',
        requestedLocale: 'en',
        fallbackLocale: 'en',
        reason: 'placeholder',
        count: 2,
      },
    ]);
  });

  it('attributes a placeholder gap to the catalog that actually rendered the copy', () => {
    const runtime = createWebTranslationRuntime({
      ko: { dashboard: { pending: '서명 대기 {count}건' } },
      en: { dashboard: {} },
    });

    expect(runtime.translate('en', 'dashboard.pending')).toBe('서명 대기 {count}건');
    expect(runtime.getFallbackReport().entries).toEqual([
      {
        key: 'dashboard.pending',
        requestedLocale: 'en',
        fallbackLocale: 'ko',
        reason: 'missing',
        count: 1,
      },
      {
        key: 'dashboard.pending',
        requestedLocale: 'en',
        fallbackLocale: 'ko',
        reason: 'placeholder',
        count: 1,
      },
    ]);
  });

  it('never resolves a slot from an inherited object member', () => {
    const runtime = createWebTranslationRuntime(catalogs);

    expect(runtime.translate('en', 'dashboard.inherited', { count: 1 })).toBe('{constructor}');
  });
});
