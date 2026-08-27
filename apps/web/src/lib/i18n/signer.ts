import type { WebTranslationDomain } from './types';

/**
 * Signer copy for the public signing link: identity verification, the document
 * reading/filling surface, the capture sheet, the terminal notices, and the
 * completion takeover.
 *
 * These screens are seen by people who never log in, so their locale comes from
 * the link or the sender rather than a saved preference. The copy therefore
 * assumes no product familiarity and names the next action explicitly.
 *
 * This domain also owns the copy of the *shared* fill surface — the page
 * chrome, the field affordances and the capture sheet — which the share-link
 * recipient flow renders through the very same components. Those strings are
 * borrowed by `SHARE_FILL_COPY` rather than copied into the `share` domain: one
 * rendered screen, one string. `share` owns only the words a recipient says
 * differently (see `lib/fill-copy.ts`).
 */
export const SIGNER_TRANSLATIONS = {
  // --- identity verification gate -----------------------------------------
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
  /** Accessible name of the pre-meta skeleton, read while the link resolves. */
  loading: { ko: '잠시만 기다려 주세요.', en: 'Please wait.' },

  // --- sender branding header (shared with the share flow) ----------------
  /** Stands in for a sender who never set a display name. */
  senderFallback: { ko: '발신자', en: 'Sender' },
  /**
   * Caption under the sender's name. Korean reads as a suffix of the name above
   * it; English is a standalone clause, because a possessive suffix has no
   * English equivalent that survives an empty or non-Korean name.
   */
  senderCaption: { ko: '님이 보낸 계약', en: 'sent you a contract' },
  logoAlt: { ko: '{name} 로고', en: '{name} logo' },

  // --- document viewer (shared surface) -----------------------------------
  viewerCtaContinue: { ko: '서명하기', en: 'Sign' },
  viewerCtaComplete: { ko: '서명 완료', en: 'Complete signing' },
  viewerLoadError: {
    ko: '문서를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not load the document. Please try again shortly.',
  },
  viewerPageError: {
    ko: '{page}페이지를 불러올 수 없어요.',
    en: 'We could not load page {page}.',
  },
  /** Accessible name of one rasterized contract page. */
  viewerPageLabel: { ko: '계약 {page}페이지', en: 'Contract page {page}' },
  viewerProgress: {
    ko: '서명할 항목 {total}곳 중 {done}곳을 작성했어요.',
    en: 'Completed {done} of {total} signing fields.',
  },
  viewerProgressNone: { ko: '서명할 항목이 없어요.', en: 'There are no fields to sign.' },
  viewerProgressAllDone: { ko: '모든 항목을 작성했어요.', en: 'All fields are complete.' },

  // --- field overlay (shared surface) -------------------------------------
  /** `{label}` is the field-type noun from `common.field*`. */
  fieldDoneLabel: { ko: '{label} 필드, 작성 완료', en: '{label} field, completed' },
  fieldInputLabel: {
    ko: '{label} 필드, 탭하여 입력해 주세요',
    en: '{label} field, tap to enter a value',
  },
  /** Stand-in for a value the server already holds but the client never fetched. */
  fieldDone: { ko: '작성됨', en: 'Completed' },
  fieldValueAlt: { ko: '{label} 입력값', en: '{label} value' },
  /** "Tap here" affordance on an unfilled field, by type. */
  fieldAffordanceSignature: { ko: '여기에 서명', en: 'Sign here' },
  fieldAffordanceDate: { ko: '여기에 날짜', en: 'Enter date' },
  fieldAffordanceText: { ko: '여기에 입력', en: 'Enter text' },

  // --- capture sheet (shared surface) -------------------------------------
  sheetTitleSignature: { ko: '서명 입력', en: 'Add signature' },
  sheetTitleDate: { ko: '날짜 입력', en: 'Enter date' },
  sheetTitleText: { ko: '내용 입력', en: 'Enter text' },
  sheetModeDraw: { ko: '그리기', en: 'Draw' },
  sheetModeType: { ko: '입력', en: 'Type' },
  sheetModeLabel: { ko: '서명 입력 방식', en: 'Signature input method' },
  sheetPadLabel: { ko: '서명 그리기 영역', en: 'Signature drawing area' },
  sheetDrawHint: {
    ko: '아래 칸에 손가락이나 펜으로 서명해 주세요.',
    en: 'Sign in the box below with your finger or pen.',
  },
  sheetTypeHint: {
    ko: '이름을 입력하고 마음에 드는 글씨체를 골라 주세요.',
    en: 'Enter your name and choose a font.',
  },
  sheetTypePlaceholder: { ko: '이름', en: 'Name' },
  sheetFontLabel: { ko: '글씨체', en: 'Font' },
  sheetDateLabel: { ko: '날짜', en: 'Date' },
  sheetDateHint: { ko: '서명한 날짜를 입력해 주세요.', en: 'Enter the signing date.' },
  sheetTextLabel: { ko: '내용', en: 'Text' },
  sheetTextPlaceholder: { ko: '내용을 입력해 주세요', en: 'Enter text' },
  sheetTextHint: { ko: '필요한 내용을 입력해 주세요.', en: 'Enter the required text.' },
  sheetReset: { ko: '다시', en: 'Reset' },
  sheetApply: { ko: '적용', en: 'Apply' },
  sheetClose: { ko: '닫기', en: 'Close' },
  sheetSaveError: {
    ko: '서명을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not save your signature. Please try again shortly.',
  },

  // --- terminal notices for a non-signable link ---------------------------
  noticeSignedTitle: { ko: '서명을 완료했어요', en: 'Signing is complete' },
  noticeSignedBody: {
    ko: '이미 서명을 완료한 계약이에요.',
    en: 'You have already signed this contract.',
  },
  noticeUnavailableTitle: {
    ko: '서명할 수 없는 계약이에요',
    en: 'This contract is unavailable for signing',
  },
  noticeUnavailableBody: {
    ko: '더 이상 서명할 수 없는 계약이에요. 발신자에게 문의해 주세요.',
    en: 'This contract can no longer be signed. Contact the sender.',
  },
  noticeInvalidLinkTitle: { ko: '링크를 확인해 주세요', en: 'Check your link' },
  noticeInvalidLinkBody: {
    ko: '서명 링크가 올바르지 않아요. 발신자에게 링크를 다시 요청해 주세요.',
    en: 'This signing link is invalid. Ask the sender for a new link.',
  },

  // --- completion takeover -------------------------------------------------
  /**
   * Korean keeps the exclamation mark of the server's completion catalog; the
   * English voice guide bans it (messaging/i18n-key-naming-and-voice.md §3).
   */
  doneTitle: { ko: '서명이 완료되었습니다!', en: 'Signing complete' },
  doneBody: {
    ko: '작성하신 서명이 안전하게 전달됐어요.',
    en: 'Your signature has been delivered securely.',
  },
  doneDocumentLabel: { ko: '서명한 문서', en: 'Signed document' },
  doneNextAllDone: {
    ko: '모든 서명이 끝났어요. 완료된 계약서를 메일로 보내 드릴게요.',
    en: 'All signatures are complete. We will email the completed contract.',
  },
  doneNextWaiting: {
    ko: '다른 분들의 서명이 끝나면 완료된 계약서를 메일로 보내 드릴게요.',
    en: 'We will email the completed contract when the other signatures are complete.',
  },

  /** Finalize-CTA failure fallback, used when the server sends no message. */
  completeError: {
    ko: '서명을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not complete signing. Please try again shortly.',
  },
} as const satisfies WebTranslationDomain;
