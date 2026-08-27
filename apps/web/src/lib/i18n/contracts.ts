import type { WebTranslationDomain } from './types';

/**
 * Contract-detail copy: a single contract's status timeline, recipient list,
 * audit trail, and the completed-document download.
 *
 * Intentionally empty for now: this copy still lives alongside the detail
 * components and moves here when that screen is migrated. Declared up front so
 * the migration inherits its key prefix instead of inventing one.
 */
export const CONTRACTS_TRANSLATIONS = {} as const satisfies WebTranslationDomain;
