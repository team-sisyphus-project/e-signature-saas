import {
  localeFromBrowserLanguages,
  parseLocale,
  resolvePublicEntryLocale,
  resolveLocale,
} from './locale';

describe('web locale resolver', () => {
  it('normalises supported language tags', () => {
    expect(parseLocale('en-US')).toBe('en');
    expect(parseLocale('ko_KR')).toBe('ko');
    expect(parseLocale('fr-FR')).toBeUndefined();
  });

  it('uses a logged-in user preference before sender and browser values', () => {
    expect(
      resolveLocale({ userLocale: 'en', senderLocale: 'ko', browserLanguages: ['ko-KR'] }),
    ).toBe('en');
  });

  it('uses the sender locale for public links before browser preferences', () => {
    expect(resolveLocale({ senderLocale: 'en', browserLanguages: ['ko-KR'] })).toBe('en');
  });

  it('uses an explicit link locale before sender and browser preferences', () => {
    expect(resolveLocale({ linkLocale: 'en', senderLocale: 'ko', browserLanguages: ['ko-KR'] })).toBe('en');
    expect(resolvePublicEntryLocale({ linkLocale: 'en', senderLocale: 'ko', browserLanguages: ['ko-KR'] })).toBe('en');
  });

  it('skips unsupported and missing values, and keeps signed-in preference out of public entry', () => {
    expect(resolveLocale({ userLocale: 'fr', senderLocale: 'en', browserLanguages: ['ko'] })).toBe('en');
    expect(resolvePublicEntryLocale({ senderLocale: undefined, browserLanguages: ['fr-FR', 'en-US'] })).toBe('en');
    expect(resolvePublicEntryLocale({ senderLocale: 'ko', browserLanguages: ['en'], userLocale: 'en' } as never)).toBe('ko');
  });

  it('uses the first supported browser language, then defaults to Korean', () => {
    expect(localeFromBrowserLanguages(['fr-FR', 'en-GB', 'ko-KR'])).toBe('en');
    expect(resolveLocale({ browserLanguages: ['ko-KR'] })).toBe('ko');
    expect(resolveLocale({ browserLanguages: ['fr-FR', 'ja-JP'] })).toBe('ko');
    expect(resolveLocale()).toBe('ko');
  });
});
