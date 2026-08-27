import { ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { SignRequestAccessMode, SignRequestStatus } from '@repo/db';
import { DEFAULT_LOCALE, type SupportedLocale } from '../i18n/locale-resolver';
import { translate } from '../i18n/server-translations';

/** Derived, sender-facing lifecycle state of a share link. */
export type ShareLinkState = 'active' | 'expired' | 'revoked' | 'completed';

/** The lifecycle columns needed to derive a link's state. */
export interface LinkLifecycleFields {
  status: SignRequestStatus;
  linkExpiresAt: Date | null;
  linkRevokedAt: Date | null;
}

/** Lifecycle columns plus the access mode, needed to gate public access. */
export interface LinkAccessFields extends LinkLifecycleFields {
  accessMode: SignRequestAccessMode;
}

/**
 * Derive a link's lifecycle state. Revocation wins over expiry (an explicit
 * sender action), which wins over completion, which wins over active.
 */
export function deriveLinkState(link: LinkLifecycleFields, now: Date = new Date()): ShareLinkState {
  if (link.linkRevokedAt) return 'revoked';
  if (link.linkExpiresAt && link.linkExpiresAt.getTime() <= now.getTime()) return 'expired';
  if (link.status === SignRequestStatus.SIGNED) return 'completed';
  return 'active';
}

/**
 * Guard every public access path: the row must be a LINK request and must not
 * be revoked or expired. Throws the matching status code + friendly copy:
 *   • not a LINK / missing      → 404 invalidLink
 *   • revoked                   → 403 revoked
 *   • expired                   → 410 expired
 * Returns the derived state (`active` or `completed`) when accessible.
 *
 * `locale` is the language the recipient is being answered in. It defaults to
 * Korean — the product default — for the sender-facing callers that reach this
 * guard from an authenticated route.
 */
export function assertLinkAccessible(
  link: LinkAccessFields | null | undefined,
  now: Date = new Date(),
  locale: SupportedLocale = DEFAULT_LOCALE,
): ShareLinkState {
  if (!link || link.accessMode !== SignRequestAccessMode.LINK) {
    throw new NotFoundException(translate(locale, 'share.invalidLink'));
  }
  const state = deriveLinkState(link, now);
  if (state === 'revoked') throw new ForbiddenException(translate(locale, 'share.revoked'));
  if (state === 'expired') throw new GoneException(translate(locale, 'share.expired'));
  return state;
}
