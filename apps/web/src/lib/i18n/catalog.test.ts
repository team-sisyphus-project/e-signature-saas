import { SUPPORTED_LOCALES, type SupportedLocale } from '../locale';
import { translateWeb, type WebTranslationKey } from '../web-translations';
import {
  WEB_TRANSLATIONS,
  WEB_TRANSLATION_DOMAINS,
  WEB_TRANSLATION_DOMAIN_NAMES,
  composeWebTranslations,
} from './index';
import type { WebTranslationDomainCatalog } from './types';

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/** Sorted `{name}` slots of one catalog value, e.g. `'{count}건'` yields `['count']`. */
function slotsOf(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] ?? '').sort();
}

function domainOf(locale: SupportedLocale, domain: string): WebTranslationDomainCatalog {
  return WEB_TRANSLATIONS[locale][domain] ?? {};
}

describe('domain-scoped catalog composition', () => {
  it('transposes an authored domain into one catalog per supported locale', () => {
    const catalogs = composeWebTranslations({
      demo: { hello: { ko: '안녕하세요', en: 'Hello' } },
    });

    expect(catalogs).toEqual({
      ko: { demo: { hello: '안녕하세요' } },
      en: { demo: { hello: 'Hello' } },
    });
  });

  it('declares the domain taxonomy the whole product keys against', () => {
    expect([...WEB_TRANSLATION_DOMAIN_NAMES]).toEqual([
      'common',
      'auth',
      'dashboard',
      'wizard',
      'settings',
      'templates',
      'contracts',
      'signer',
      'share',
    ]);
  });

  it('publishes every declared domain in every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(WEB_TRANSLATIONS[locale]).sort()).toEqual(
        [...WEB_TRANSLATION_DOMAIN_NAMES].sort(),
      );
    }
  });
});

describe('ko/en catalog parity', () => {
  const authoredDomains = Object.entries(WEB_TRANSLATION_DOMAINS);
  const domainNames = Object.keys(WEB_TRANSLATION_DOMAINS);

  // Parity is asserted against the *authored* domains, not the composed
  // catalogs: composition writes the same key set into every locale by
  // construction, so a ko-only key would surface there as `undefined` rather
  // than as an absent key, and a comparison of composed key sets could never
  // fail. The authored entry is where the gap is real.
  it.each(authoredDomains)('defines every %s key in every supported locale', (domain, entries) => {
    const incomplete: string[] = [];

    for (const [key, entry] of Object.entries(entries)) {
      const locales = Object.keys(entry).sort();
      if (locales.join() !== [...SUPPORTED_LOCALES].sort().join()) {
        incomplete.push(`${domain}.${key} [${locales.join(', ')}]`);
      }
    }

    expect(incomplete).toEqual([]);
  });

  it.each(domainNames)('ships non-blank copy for every %s key in every locale', (domain) => {
    const blank: string[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      for (const [key, value] of Object.entries(domainOf(locale, domain))) {
        if (typeof value !== 'string' || value.trim() === '') {
          blank.push(`${locale}:${domain}.${key}`);
        }
      }
    }

    expect(blank).toEqual([]);
  });

  it.each(domainNames)('keeps identical interpolation slots across locales in %s', (domain) => {
    const english = domainOf('en', domain);
    const mismatched: string[] = [];

    for (const [key, korean] of Object.entries(domainOf('ko', domain))) {
      const translated = english[key];
      if (typeof korean !== 'string' || typeof translated !== 'string') continue;
      // A slot present in one locale only renders as a literal `{name}` in the
      // other, so slot drift is a user-visible defect, not a style difference.
      if (slotsOf(korean).join() !== slotsOf(translated).join())
        mismatched.push(`${domain}.${key}`);
    }

    expect(mismatched).toEqual([]);
  });
});

describe('key paths consumed by shipped screens', () => {
  // Guards the split itself: components already call these keys, so a domain
  // that moved under a different prefix shows up here as fallback copy.
  const cases: Array<[WebTranslationKey, string, string]> = [
    ['auth.product', '전자계약', 'eSign'],
    ['auth.login', '로그인', 'Sign in'],
    ['dashboard.title', '계약', 'Contracts'],
    ['dashboard.newContract', '새 계약 생성', 'Create contract'],
    ['wizard.chooseTitle', '새 계약을 만들어요', 'Create a new contract'],
    ['settings.languageTitle', '언어 설정', 'Language settings'],
    ['signer.verifyTitle', '본인확인', 'Verify your identity'],
  ];

  it.each(cases)('resolves %s in both locales', (key, korean, english) => {
    expect(translateWeb('ko', key)).toBe(korean);
    expect(translateWeb('en', key)).toBe(english);
  });
});
