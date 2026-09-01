import { I18nController } from './i18n.controller';
import { SERVER_TRANSLATIONS } from './server-translations';

describe('I18nController resource lookup', () => {
  const controller = new I18nController();

  it('returns the requested server catalog for a supported locale', () => {
    expect(controller.resources('en')).toEqual({
      locale: 'en',
      resources: SERVER_TRANSLATIONS.en,
    });
  });

  it('normalises language tags and falls back to Korean for unsupported locales', () => {
    expect(controller.resources('en-US')).toEqual({
      locale: 'en',
      resources: SERVER_TRANSLATIONS.en,
    });
    expect(controller.resources('fr-FR')).toEqual({
      locale: 'ko',
      resources: SERVER_TRANSLATIONS.ko,
    });
  });
});
