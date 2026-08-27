import type { WebTranslationDomain } from './types';

/**
 * Signer copy for the public signing link: the identity-verification gate that
 * runs before the document is revealed.
 *
 * These screens are seen by people who never log in, so their locale comes from
 * the link or the sender rather than a saved preference. The copy therefore
 * assumes no product familiarity and names the next action explicitly.
 */
export const SIGNER_TRANSLATIONS = {
  verifyTitle: { ko: '본인확인', en: 'Verify your identity' },
  verifyHint: {
    ko: '문자로 받은 6자리 인증 코드를 입력해 주세요.',
    en: 'Enter the 6-digit verification code sent by text message.',
  },
  codeLabel: { ko: '인증 코드', en: 'Verification code' },
  verify: { ko: '본인확인', en: 'Verify identity' },
  /** Button label while the code is being checked. */
  verifying: { ko: '확인 중', en: 'Verifying' },
  /** Transport failure. Server-authored rejections surface verbatim instead. */
  genericError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again shortly.',
  },
} as const satisfies WebTranslationDomain;
