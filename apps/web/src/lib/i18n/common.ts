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
} as const satisfies WebTranslationDomain;
