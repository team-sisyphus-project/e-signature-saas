import type { WebTranslationDomain } from './types';

/**
 * Copy that belongs to no single screen: shared action labels (save, cancel,
 * close, retry), shared status words, and the neutral transport-failure line.
 *
 * Intentionally empty for now. A key is promoted here only once a second domain
 * actually needs the same string — promoting on suspicion produces keys nothing
 * renders, which is the exact drift this catalog exists to prevent. Until then,
 * the duplicated wording lives in each owning domain (for example
 * `dashboard.loadError` and `signer.genericError`, which are the same sentence
 * reached from different screens).
 */
export const COMMON_TRANSLATIONS = {} as const satisfies WebTranslationDomain;
