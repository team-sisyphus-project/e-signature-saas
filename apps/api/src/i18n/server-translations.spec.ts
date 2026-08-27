import { Logger } from '@nestjs/common';
import type { SupportedLocale } from './locale-resolver';
import {
  SERVER_TRANSLATIONS,
  UNKNOWN_SERVER_TRANSLATION_FALLBACK,
  translate,
  type TranslationKey,
} from './server-translations';

/**
 * `translate` feeds emails and signed PDFs, where a throw destroys the whole
 * artifact and a leaked key is permanent. Keys reach it from template strings
 * built at runtime (`auditCertificate.${action}`), so an unknown key is a
 * reachable state, not a type error. The casts below reproduce exactly that.
 */
const unknown = (key: string) => key as TranslationKey;
const unpublished = (locale: string) => locale as SupportedLocale;

describe('server translation fallback', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolved copy', () => {
    it('returns the localized string when the catalog has one', () => {
      expect(translate('en', 'signing.completed')).toBe('Signing is complete!');
      expect(translate('ko', 'signing.completed')).toBe('서명이 완료되었습니다!');
    });

    it('reads names containing no separator ambiguity from the right scope', () => {
      expect(translate('en', 'completionEmail.serviceName')).toBe(
        SERVER_TRANSLATIONS.en.completionEmail.serviceName,
      );
    });
  });

  describe('degrading to the Korean base catalog', () => {
    it('serves Korean copy when the requested locale is not published', () => {
      expect(translate(unpublished('fr'), 'signing.completed')).toBe(
        SERVER_TRANSLATIONS.ko.signing.completed,
      );
    });

    it('serves Korean copy rather than throwing on a nullish catalog', () => {
      expect(() => translate(unpublished(''), 'common.sender')).not.toThrow();
      expect(translate(unpublished(''), 'common.sender')).toBe(SERVER_TRANSLATIONS.ko.common.sender);
    });
  });

  describe('degrading to safe placeholder text', () => {
    it.each([
      ['an unknown name in a known scope', 'signing.notWritten'],
      ['an unknown scope', 'invoicing.reminder'],
      ['a key with no separator', 'signing'],
      ['a key with an empty name', 'signing.'],
      ['a key with an empty scope', '.completed'],
      ['an empty key', ''],
    ])('returns the Korean placeholder for %s', (_case, key) => {
      expect(translate('en', unknown(key))).toBe(UNKNOWN_SERVER_TRANSLATION_FALLBACK);
    });

    it('does not mistake inherited object members for copy', () => {
      expect(translate('en', unknown('constructor.name'))).toBe(UNKNOWN_SERVER_TRANSLATION_FALLBACK);
      expect(translate('en', unknown('common.constructor'))).toBe(
        UNKNOWN_SERVER_TRANSLATION_FALLBACK,
      );
      expect(translate('en', unknown('common.hasOwnProperty'))).toBe(
        UNKNOWN_SERVER_TRANSLATION_FALLBACK,
      );
    });

    it('never throws, whatever the key looks like', () => {
      for (const key of ['', '.', '..', 'signing', 'nope.nope', 'toString', 'constructor.name']) {
        expect(() => translate('en', unknown(key))).not.toThrow();
      }
    });

    it('never exposes the requested key or an empty string to the reader', () => {
      const text = translate('en', unknown('auditCertificate.notWrittenYet'));

      expect(text).not.toContain('auditCertificate');
      expect(text).not.toContain('notWrittenYet');
      expect(text.trim()).not.toBe('');
    });

    it('states that copy is pending in Korean, matching the web placeholder', () => {
      expect(UNKNOWN_SERVER_TRANSLATION_FALLBACK).toBe('내용을 준비하고 있습니다.');
    });
  });

  describe('reporting the gap', () => {
    it('logs a missing key once per locale instead of on every render', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');

      translate('en', unknown('share.repeatedGap'));
      translate('en', unknown('share.repeatedGap'));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('share.repeatedGap'));
    });

    it('stays silent when the localized copy is present', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');

      translate('en', 'share.submitted');

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
