import type { WebTranslationDomain } from './types';

/**
 * Shared-link recipient copy: the password gate, the terminal notices, and the
 * words the recipient flow says differently from the signer flow.
 *
 * Like `signer`, this audience never logs in, so its locale comes from the link
 * or the sender.
 *
 * The recipient reads and fills the document on the *same* components the
 * signer does, so this domain deliberately does not restate the page chrome or
 * the capture sheet — `SHARE_FILL_COPY` (`lib/fill-copy.ts`) points those at the
 * `signer` keys. What lives here is what changes with the audience: a recipient
 * "작성/제출"s where a signer "서명"s.
 */
export const SHARE_TRANSLATIONS = {
  // --- password gate --------------------------------------------------------
  gateTitle: { ko: '비밀번호를 입력해 주세요', en: 'Enter the password' },
  gateHint: {
    ko: '이 계약서는 비밀번호로 보호되어 있어요.',
    en: 'This contract is password protected.',
  },
  gateLabel: { ko: '비밀번호', en: 'Password' },
  gatePlaceholder: { ko: '비밀번호를 입력해 주세요', en: 'Enter the password' },
  gateSubmit: { ko: '확인', en: 'Continue' },
  /** Button label while the password is being checked. */
  gateSubmitting: { ko: '확인 중', en: 'Checking' },
  /** Transport failure. Server-authored rejections surface verbatim instead. */
  gateError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again shortly.',
  },

  // --- document viewer: only what a recipient words differently -------------
  viewerCtaContinue: { ko: '작성하기', en: 'Continue' },
  viewerCtaComplete: { ko: '제출하기', en: 'Submit' },
  viewerProgress: {
    ko: '작성할 항목 {total}곳 중 {done}곳을 작성했어요.',
    en: 'Completed {done} of {total} fields.',
  },
  viewerProgressNone: {
    ko: '작성할 항목이 없어요.',
    en: 'There are no fields to complete.',
  },

  // --- capture sheet: only the type hints change ---------------------------
  sheetDateHint: { ko: '날짜를 입력해 주세요.', en: 'Enter the date.' },
  sheetTextHint: { ko: '내용을 입력해 주세요.', en: 'Enter the required information.' },

  // --- terminal notices for a link that cannot be opened/filled ------------
  noticeExpiredTitle: { ko: '링크가 만료됐어요', en: 'This link has expired' },
  noticeExpiredBody: {
    ko: '이 링크는 유효 기간이 지났어요. 보낸 분에게 새 링크를 요청해 주세요.',
    en: 'This link is no longer valid. Ask the sender for a new link.',
  },
  noticeDisabledTitle: { ko: '지금은 열 수 없는 링크예요', en: 'This link is unavailable' },
  noticeDisabledBody: {
    ko: '보낸 분이 이 링크를 사용 중지했어요. 보낸 분에게 문의해 주세요.',
    en: 'The sender has disabled this link. Contact the sender for help.',
  },
  noticeInvalidLinkTitle: { ko: '링크를 확인해 주세요', en: 'Check your link' },
  noticeInvalidLinkBody: {
    ko: '링크가 올바르지 않아요. 보낸 분에게 링크를 다시 요청해 주세요.',
    en: 'This link is invalid. Ask the sender to send it again.',
  },
  noticeNotSignableTitle: {
    ko: '지금은 작성할 수 없어요',
    en: 'This contract cannot be completed',
  },
  noticeNotSignableBody: {
    ko: '지금은 작성할 수 없는 계약이에요. 보낸 분에게 문의해 주세요.',
    en: 'This contract is not available right now. Contact the sender.',
  },
  noticeSubmittedTitle: { ko: '이미 제출했어요', en: 'Already submitted' },
  noticeSubmittedBody: {
    ko: '이미 제출을 완료한 계약이에요.',
    en: 'You have already submitted this contract.',
  },

  // --- completion takeover -------------------------------------------------
  /** Korean keeps the celebratory mark; the English voice guide bans it (§3). */
  doneTitle: { ko: '제출이 완료되었습니다!', en: 'Submission complete' },
  doneBody: {
    ko: '작성하신 내용이 안전하게 전달됐어요.',
    en: 'Your response has been delivered securely.',
  },
  doneDocumentLabel: { ko: '제출한 문서', en: 'Submitted document' },
  /**
   * One next-step line regardless of the other participants: a fill link hands
   * nothing back, so "who else is still pending" is not the recipient's concern.
   */
  doneNext: {
    ko: '보낸 분이 확인할 수 있도록 전달했어요. 이제 창을 닫으셔도 돼요.',
    en: 'The sender can now review your response. You may close this window.',
  },

  /** Finalize-CTA failure fallback, used when the server sends no message. */
  viewerCompleteError: {
    ko: '제출하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not submit your response. Please try again shortly.',
  },
} as const satisfies WebTranslationDomain;
