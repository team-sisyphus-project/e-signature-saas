import type { WebTranslationDomain } from './types';

/**
 * Shared-link recipient copy: the password gate and the read-only document view
 * reached through a share link.
 *
 * Intentionally empty for now: this copy still lives alongside the share
 * components and moves here when that screen is migrated. Like `signer`, this
 * audience never logs in, so its locale comes from the link or the sender.
 */
export const SHARE_TRANSLATIONS = {} as const satisfies WebTranslationDomain;
