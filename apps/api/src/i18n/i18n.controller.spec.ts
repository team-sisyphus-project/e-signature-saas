import { I18nController } from './i18n.controller';
import { DEFAULT_LOCALE } from './locale-resolver';
import { SERVER_TRANSLATIONS } from './server-translations';

/**
 * The catalog endpoint is the browser's only lookup path for server copy, and
 * the path segment is not always a locale we publish. These cases pin what the
 * endpoint does when the request cannot be honoured verbatim.
 */
describe('I18nController resource lookup', () => {
  const controller = new I18nController();

  describe('honouring a supported path locale', () => {
    it('serves the requested catalog and ignores lower tiers', () => {
      expect(controller.resources('en', 'ko-KR,ko;q=0.9', 'ko')).toEqual({
        locale: 'en',
        resources: SERVER_TRANSLATIONS.en,
      });
    });

    it('normalises region tags in the path', () => {
      expect(controller.resources('en-US').locale).toBe('en');
      expect(controller.resources('ko_KR').locale).toBe('ko');
    });
  });

  describe('negotiating an unsupported path locale', () => {
    it('serves the English catalog for /i18n/resources/fr with Accept-Language: en', () => {
      expect(controller.resources('fr', 'en')).toEqual({
        locale: 'en',
        resources: SERVER_TRANSLATIONS.en,
      });
    });

    it('honours the browser quality order rather than the header order', () => {
      expect(controller.resources('fr', 'fr;q=0.9, en-GB;q=0.8, ko;q=0.7').locale).toBe('en');
    });

    it('prefers the link parameter over Accept-Language, matching the shared resolver', () => {
      expect(controller.resources('fr', 'ko-KR', 'en').locale).toBe('en');
      expect(controller.resources('fr', 'en-US', 'ko').locale).toBe('ko');
    });

    it('lets an unsupported link parameter fall through to Accept-Language', () => {
      expect(controller.resources('fr', 'en-US', 'ja').locale).toBe('en');
    });

    it('falls back to Korean only once every tier is spent', () => {
      expect(controller.resources('fr', 'ja-JP,zh-CN;q=0.8', 'de').locale).toBe(DEFAULT_LOCALE);
      expect(controller.resources('fr').locale).toBe(DEFAULT_LOCALE);
      expect(controller.resources('').locale).toBe(DEFAULT_LOCALE);
    });
  });

  it('always answers with a published catalog, never an empty body', () => {
    for (const path of ['ko', 'en', 'fr', 'nonsense', '']) {
      const { locale, resources } = controller.resources(path);
      expect(SERVER_TRANSLATIONS[locale]).toBe(resources);
    }
  });
});
