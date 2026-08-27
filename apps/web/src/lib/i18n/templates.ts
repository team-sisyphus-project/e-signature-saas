import type { WebTranslationDomain } from './types';

/**
 * Templates copy: the `내 템플릿` list — heading, empty and error states, and the
 * per-card management actions (preview, rename, delete, start from template)
 * together with their dialogs.
 *
 * Intentionally empty for now: this copy still lives in `lib/templates-copy.ts`
 * and moves here when that screen is migrated. The domain is declared up front
 * so the migration inherits its key prefix instead of inventing one.
 */
export const TEMPLATES_TRANSLATIONS = {} as const satisfies WebTranslationDomain;
