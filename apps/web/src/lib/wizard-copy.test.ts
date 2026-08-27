/**
 * Every word the send wizard can render, verified in both locales.
 *
 * The wizard has no single copy-binding module — its steps call `t()` directly
 * and three lib helpers translate on the caller's behalf (`fieldTypeLabel`,
 * `recipientLabel`, and the upload guards). So this suite works from both ends:
 * it sweeps the whole `wizard` domain for copy that never got translated or
 * never got its slot filled, and it pins the helpers that decide *which* key a
 * screen asks for.
 */

import { WIZARD_TRANSLATIONS } from './i18n/wizard';
import { FIELD_TYPES, fieldTypeLabel } from './field-geometry';
import { RECIPIENT_MESSAGES, recipientLabel, validateRecipients } from './recipients';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, formatFileSize, validatePdfFile } from './upload';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslate,
  type WebTranslationKey,
} from './web-translations';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locale';
import type { RecipientDraft } from '@/components/wizard/wizard-context';

/** Matches any Hangul syllable, the marker of copy that never got translated. */
const HANGUL = /[가-힣]/;

/**
 * Every slot name the wizard domain interpolates, with a value for each. One
 * bag for the whole domain, so a key that grows a new slot fails loudly here
 * (as an unfilled `{name}`) instead of shipping a hole in a sentence.
 */
const SLOT_VALUES = {
  name: 'Standard NDA',
  index: 2,
  count: 3,
  page: 1,
  total: 4,
  percent: 60,
  limit: MAX_UPLOAD_MB,
  field: 'Signature',
} as const;

/** An isolated runtime per test keeps the shared browser report clean. */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

const WIZARD_KEYS = Object.keys(WIZARD_TRANSLATIONS).map(
  (key) => `wizard.${key}` as WebTranslationKey,
);

function pdfFile(name: string, size: number, type = 'application/pdf'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function recipient(name: string): RecipientDraft {
  return { id: 'r1', email: 'signer@example.com', name };
}

describe('the wizard domain renders in every supported locale', () => {
  it.each([...SUPPORTED_LOCALES])('resolves every wizard key in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = WIZARD_KEYS.map((key) => t(key, SLOT_VALUES));

    // A key with no copy in this locale falls back to Korean and is reported;
    // the empty report is the assertion that matters.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(rendered).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(rendered.filter((value) => value.trim() === '')).toEqual([]);
    // A slot the bag does not cover survives as a literal `{name}` on screen.
    expect(rendered.filter((value) => value.includes('{'))).toEqual([]);
  });

  it('leaves no Korean in the English wizard', () => {
    const { t } = translatorFor('en');

    const untranslated = WIZARD_KEYS.filter((key) => HANGUL.test(t(key, SLOT_VALUES)));

    expect(untranslated).toEqual([]);
  });

  it('keeps the Korean wording the wizard shipped with', () => {
    const { t } = translatorFor('ko');

    expect(t('wizard.uploadStepTitle')).toBe('계약 PDF를 올려 주세요');
    expect(t('wizard.deliveryTitle')).toBe('어떻게 전달할까요?');
    expect(t('wizard.recipientsTitle')).toBe('받는 분을 입력해 주세요');
    expect(t('wizard.reviewTitle')).toBe('발송 전 확인해 주세요');
    expect(t('wizard.linkTitle')).toBe('링크로 공유할게요');
    expect(t('wizard.sendSuccessTitle')).toBe('계약 발송이 완료되었습니다!');
  });
});

describe('field-type vocabulary', () => {
  it.each([...SUPPORTED_LOCALES])('names all three placeable types in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const labels = FIELD_TYPES.map((type) => fieldTypeLabel(t, type));

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(labels.filter((label) => label.trim() === '')).toEqual([]);
    // Three distinct words: a shared label would make two tools indistinguishable.
    expect(new Set(labels).size).toBe(FIELD_TYPES.length);
  });

  it('reads the same word in the wizard and in a saved template', () => {
    const { t } = translatorFor('en');

    expect(fieldTypeLabel(t, 'SIGNATURE')).toBe('Signature');
    expect(fieldTypeLabel(t, 'DATE')).toBe('Date');
    expect(fieldTypeLabel(t, 'TEXT')).toBe('Text');
  });
});

describe('recipient labelling', () => {
  it('prefers the name the sender typed', () => {
    const { t } = translatorFor('en');

    expect(recipientLabel(t, recipient('Jane Doe'), 0)).toBe('Jane Doe');
    // Whitespace is not a name — an all-spaces entry still needs a stand-in.
    expect(recipientLabel(t, recipient('   '), 1)).toBe('Recipient 2');
  });

  it("falls back to a 1-based position in the reader's language", () => {
    expect(recipientLabel(translatorFor('ko').t, recipient(''), 0)).toBe('받는 분 1');
    expect(recipientLabel(translatorFor('en').t, recipient(''), 0)).toBe('Recipient 1');
  });
});

describe('recipient validation messages', () => {
  it('reports catalog keys rather than sentences, so the gate stays locale-free', () => {
    const errors = validateRecipients([
      { id: '1', email: '', name: '' },
      { id: '2', email: 'bad', name: '' },
      { id: '3', email: 'dup@x.com', name: '' },
      { id: '4', email: 'DUP@x.com', name: '' },
    ]);

    expect(errors['1']?.email).toBe('wizard.emailRequired');
    expect(errors['2']?.email).toBe('wizard.emailInvalid');
    expect(errors['4']?.email).toBe('wizard.emailDuplicate');
  });

  it.each([...SUPPORTED_LOCALES])('resolves every validation message in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const messages = Object.values(RECIPIENT_MESSAGES).map((key) => t(key));

    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(messages.filter((message) => message.trim() === '')).toEqual([]);
  });

  it("names the fix rather than the reader's mistake", () => {
    const { t } = translatorFor('en');

    expect(t(RECIPIENT_MESSAGES.emailRequired)).toBe('Enter an email address.');
    expect(t(RECIPIENT_MESSAGES.emailInvalid)).toBe('Check the email address format.');
  });
});

describe('upload guards', () => {
  it('accepts a PDF within the size cap', () => {
    expect(validatePdfFile(pdfFile('contract.pdf', 1024))).toBeNull();
    expect(validatePdfFile(pdfFile('contract.pdf', MAX_UPLOAD_BYTES))).toBeNull();
  });

  it('accepts a .pdf whose browser-reported type is missing', () => {
    expect(validatePdfFile(pdfFile('CONTRACT.PDF', 1024, ''))).toBeNull();
  });

  it('names which rule a rejected file trips', () => {
    expect(validatePdfFile(pdfFile('notes.txt', 1024, 'text/plain'))).toBe(
      'wizard.guardInvalidType',
    );
    expect(validatePdfFile(pdfFile('contract.pdf', 0))).toBe('wizard.guardEmpty');
    expect(validatePdfFile(pdfFile('contract.pdf', MAX_UPLOAD_BYTES + 1))).toBe(
      'wizard.guardTooLarge',
    );
  });

  it('quotes the enforced cap, not a second number that could drift', () => {
    const { t } = translatorFor('en');

    expect(t('wizard.guardTooLarge', { limit: MAX_UPLOAD_MB })).toContain(`${MAX_UPLOAD_MB}MB`);
    expect(MAX_UPLOAD_BYTES).toBe(MAX_UPLOAD_MB * 1024 * 1024);
  });

  it('formats sizes identically in both locales', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
