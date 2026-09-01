import { localeFromAcceptLanguage, resolveLocale, resolvePublicEntryLocale } from './locale-resolver';
import {
  getServerTranslationFallbackReport,
  resetServerTranslationFallbackReport,
  translate,
  UNKNOWN_TRANSLATION_FALLBACK,
} from './server-translations';

describe('locale resolver', () => {
  afterEach(() => resetServerTranslationFallbackReport());

  it('uses stored user locale before sender and browser locales', () => {
    expect(resolveLocale({ userLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko-KR' })).toBe('en');
  });

  it('uses sender locale for public links before the recipient browser locale', () => {
    expect(resolveLocale({ senderLocale: 'en', acceptLanguage: 'ko-KR,ko;q=0.9' })).toBe('en');
  });

  it('uses an explicit link locale before sender and browser locales', () => {
    expect(resolveLocale({ linkLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko' })).toBe('en');
    expect(resolvePublicEntryLocale({ linkLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko' })).toBe('en');
  });

  it('skips unsupported or missing higher-priority values', () => {
    expect(resolveLocale({ userLocale: 'fr', linkLocale: 'xx', senderLocale: 'en', acceptLanguage: 'ko' })).toBe('en');
    expect(resolvePublicEntryLocale({ linkLocale: 'xx', senderLocale: 'fr', acceptLanguage: 'en-US' })).toBe('en');
    expect(resolvePublicEntryLocale({ linkLocale: null, senderLocale: undefined, acceptLanguage: null })).toBe('ko');
  });

  it('does not let a logged-in preference leak into public entry resolution', () => {
    expect(resolveLocale({ userLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko' })).toBe('en');
    expect(resolvePublicEntryLocale({ senderLocale: 'ko', acceptLanguage: 'en', userLocale: 'en' } as never)).toBe('ko');
  });

  it('recognises browser region tags and quality preferences', () => {
    expect(localeFromAcceptLanguage('fr;q=0.9, en-US;q=0.8, ko;q=0.7')).toBe('en');
    expect(localeFromAcceptLanguage('ko; q = 0, en-US; q=0.8')).toBe('en');
    expect(localeFromAcceptLanguage('en;q=2, ko;q=0.5')).toBe('ko');
    expect(localeFromAcceptLanguage('en;q=invalid, ko;q=0.5')).toBe('ko');
  });

  it('uses Accept-Language and falls back to Korean', () => {
    expect(resolveLocale({ acceptLanguage: 'ko-KR' })).toBe('ko');
    expect(resolveLocale({ acceptLanguage: 'en-US' })).toBe('en');
    expect(resolveLocale({ acceptLanguage: 'fr-FR' })).toBe('ko');
    expect(resolveLocale()).toBe('ko');
    expect(translate('en', 'signing.completed')).toBe('Signing is complete!');
  });

  it('falls back to Korean server copy and records incomplete lookups safely', () => {
    expect(translate('ko', 'signing.unknown' as never)).toBe(UNKNOWN_TRANSLATION_FALLBACK);
    expect(getServerTranslationFallbackReport()).toEqual([{
      key: 'signing.unknown',
      requestedLocale: 'ko',
      fallbackLocale: 'ko',
      reason: 'missing',
      count: 1,
    }]);
  });
});
