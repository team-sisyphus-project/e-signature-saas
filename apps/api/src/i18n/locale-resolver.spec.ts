import { localeFromAcceptLanguage, resolveLocale } from './locale-resolver';
import { translate } from './server-translations';

describe('locale resolver', () => {
  it('uses stored user locale before sender and browser locales', () => {
    expect(resolveLocale({ userLocale: 'en', senderLocale: 'ko', acceptLanguage: 'ko-KR' })).toBe('en');
  });

  it('uses sender locale for public links before the recipient browser locale', () => {
    expect(resolveLocale({ senderLocale: 'en', acceptLanguage: 'ko-KR,ko;q=0.9' })).toBe('en');
  });

  it('recognises browser region tags and quality preferences', () => {
    expect(localeFromAcceptLanguage('fr;q=0.9, en-US;q=0.8, ko;q=0.7')).toBe('en');
  });

  it('ignores Accept-Language and falls back to English copy', () => {
    expect(resolveLocale({ acceptLanguage: 'ko-KR' })).toBe('en');
    expect(resolveLocale({ acceptLanguage: 'fr-FR' })).toBe('en');
    expect(translate('en', 'signing.completed')).toBe('Signing is complete!');
  });
});
