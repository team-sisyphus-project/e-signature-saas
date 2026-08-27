import type { WebTranslationDomain } from './types';

/**
 * Copy that belongs to no single screen: vocabulary two or more domains render
 * with the same words, in the same role.
 *
 * A key is promoted here only once a second domain actually needs the same
 * string — promoting on suspicion produces keys nothing renders, which is the
 * exact drift this catalog exists to prevent. Wording that merely *coincides*
 * across screens (`dashboard.loadError` and `signer.genericError` are the same
 * sentence reached from different places) stays with its owning domain.
 */
export const COMMON_TRANSLATIONS = {
  // --- product identity ---------------------------------------------------
  /**
   * The service name, shown wherever no uploaded branding logo applies: the
   * auth screens' wordmark, the app header's brand mark, and the branding
   * preview's header/tab mockups. Three consumers across three domains, so a
   * rename has exactly one place to happen.
   */
  product: { ko: '전자계약', en: 'eSign' },
  /**
   * One-line description of the service, used as the document `description`
   * meta tag. Rendered before any locale can be resolved, so it ships in the
   * default locale — see `app/layout.tsx`.
   */
  productTagline: { ko: '전자계약 SaaS', en: 'Electronic signature SaaS' },

  // --- sign-field vocabulary ----------------------------------------------
  /**
   * The three placeable field types. Shared rather than owned by `wizard`
   * because a saved layout is read back on the templates preview with the same
   * words the wizard placed it with — a field the sender dropped as "Signature"
   * must not read as something else when they confirm the template.
   *
   * `lib/field-geometry.ts` carries the key, not the word, so geometry stays
   * copy-free.
   */
  fieldSignature: { ko: '서명', en: 'Signature' },
  fieldDate: { ko: '날짜', en: 'Date' },
  fieldText: { ko: '텍스트', en: 'Text' },
  // --- cross-cutting failure copy -----------------------------------------
  /**
   * Neutral failure line used wherever the product has nothing more specific to
   * say: a network drop, an unreadable error body, an auth screen with no
   * server message. Every domain reaches it, so it belongs to none of them.
   */
  genericError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again shortly.',
  },
  /**
   * A file the browser could not parse as a PDF. Rendered by the wizard's
   * upload preview, the templates field preview, and the signer's viewer — the
   * same fact, told to whoever happens to be holding the file.
   */
  pdfReadError: {
    ko: 'PDF를 읽을 수 없어요. 파일이 손상되지 않았는지 확인해 주세요.',
    en: 'We could not read this PDF. Check that the file is not damaged.',
  },

  // --- shared chrome ------------------------------------------------------
  /**
   * Accessible name of the dismiss (×) control that `@repo/ui`'s Dialog and
   * Sheet render. The design-system package cannot read this catalog (it must
   * stay locale-agnostic), so every app call site passes this value in.
   */
  close: { ko: '닫기', en: 'Close' },

  // --- completion downloads -----------------------------------------------
  /**
   * The completed-document download area. One component, rendered on the
   * sender's dashboard, the contract detail page, and the signer's completion
   * takeover — three domains, one screen region, so the copy is shared rather
   * than triplicated.
   */
  completionTitle: { ko: '완료 문서', en: 'Completed documents' },
  /** `{completedAt}` is the absolute KST stamp `YYYY.MM.DD HH:mm (KST)`. */
  completionNotice: {
    ko: '{completedAt}에 완료됐어요. 참여자 모두에게 메일로도 보내 드렸어요.',
    en: 'Completed on {completedAt}. We also emailed it to all participants.',
  },
  completionSigned: { ko: '최종 계약서', en: 'Signed contract' },
  completionSignedDescription: {
    ko: '서명이 모두 담긴 완료본이에요.',
    en: 'The completed contract with every signature.',
  },
  completionCertificate: { ko: '감사 추적 인증서', en: 'Audit trail certificate' },
  completionCertificateDescription: {
    ko: '계약 이력과 문서 무결성을 증명하는 문서예요.',
    en: 'A record that verifies the contract history and integrity.',
  },
  completionDownload: { ko: '내려받기', en: 'Download' },
  completionPreparing: {
    ko: '완료 문서를 준비하고 있어요. 잠시 후 다시 열어 주세요.',
    en: 'We are preparing the completed documents. Please check again shortly.',
  },
  completionError: {
    ko: '내려받지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not download the document. Please try again shortly.',
  },
  /** Badge beside the section title when the server supplies no status label. */
  completionStatus: { ko: '완료됨', en: 'Completed' },
} as const satisfies WebTranslationDomain;
