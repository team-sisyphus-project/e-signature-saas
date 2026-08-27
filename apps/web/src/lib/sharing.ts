/**
 * Share-link data access for the sender.
 *
 * Typed wrappers over the owner-scoped `/documents/:id/share-links` endpoints
 * (see `apps/api/src/sharing/sharing.controller.ts`). Response shapes mirror the
 * server's `ShareLinkView` so the detail screen binds to them directly.
 *
 * Copy lives in the `contracts` domain of the browser catalog
 * (`lib/i18n/contracts.ts`); this module carries only translation *keys*, so a
 * validity preset's window in days and the label it renders as stay paired
 * without this module knowing any one language.
 *
 * Security: a link password is request-only. It is passed straight to the create
 * call and never stored, cached, logged, or echoed back — the server hashes it
 * at rest and only ever returns `requiresPassword` (a boolean).
 */

import { apiFetch } from './api';
import { getToken } from './auth';
import type { SupportedLocale } from './locale';
import type { WebTranslate, WebTranslationKey } from './web-translations';

/** Derived, sender-facing lifecycle state of a share link (mirrors the server). */
export type ShareLinkState = 'active' | 'expired' | 'revoked' | 'completed';

/** A share link as the owner sees it. Never carries the password or its hash. */
export interface ShareLink {
  id: string;
  token: string;
  /** Absolute open/fill URL to hand to the recipient. */
  url: string;
  label: string | null;
  status: ShareLinkState;
  /** Whether opening the link requires a password (the value is never returned). */
  requiresPassword: boolean;
  /** ISO expiry instant, or null when the link never expires. */
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Settings for a new link. Password is plaintext in-flight only — see module note. */
export interface CreateShareLinkInput {
  /** Validity window in days. Ignored when `noExpiry` is true. */
  expiresInDays?: number;
  /** True ⇒ the link never expires. */
  noExpiry?: boolean;
  /** Optional access password (request-only; omit for an open link). */
  password?: string;
}

/** Lower bound the server enforces on a link password; validated client-side too. */
export const SHARE_PASSWORD_MIN_LENGTH = 4;

function authPath(documentId: string, suffix = ''): string {
  return `/documents/${encodeURIComponent(documentId)}/share-links${suffix}`;
}

/** Create a unique open/fill link with the given access settings. */
export function createShareLink(
  documentId: string,
  input: CreateShareLinkInput,
): Promise<ShareLink> {
  return apiFetch<ShareLink>(authPath(documentId), {
    method: 'POST',
    json: input,
    token: getToken() ?? undefined,
  });
}

/** List this document's share links with their derived status (newest first). */
export function listShareLinks(documentId: string): Promise<ShareLink[]> {
  return apiFetch<ShareLink[]>(authPath(documentId), { token: getToken() ?? undefined });
}

/** Revoke a link so it can no longer be opened (idempotent). */
export function revokeShareLink(documentId: string, linkId: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(authPath(documentId, `/${encodeURIComponent(linkId)}/revoke`), {
    method: 'POST',
    token: getToken() ?? undefined,
  });
}

// --- password confirm / edit (owner dashboard) ------------------------------

/**
 * The owner's view of a link's stored password, in three semantic states
 * (mirrors the server's `ShareLinkPasswordView`):
 *   • no password set       → { hasPassword: false, recoverable: false, password: null }
 *   • confirmable plaintext → { hasPassword: true,  recoverable: true,  password: '…' }
 *   • legacy (pre-migration hash, not confirmable)
 *                           → { hasPassword: true,  recoverable: false, password: null }
 * The plaintext is returned only on this authenticated owner path — never on any
 * recipient/public path.
 */
export interface ShareLinkPasswordView {
  hasPassword: boolean;
  recoverable: boolean;
  password: string | null;
}

/** Reveal a link's current access password to its owner. */
export function getShareLinkPassword(
  documentId: string,
  linkId: string,
): Promise<ShareLinkPasswordView> {
  return apiFetch<ShareLinkPasswordView>(
    authPath(documentId, `/${encodeURIComponent(linkId)}/password`),
    { token: getToken() ?? undefined },
  );
}

/**
 * Replace or clear a link's access password. A non-empty value
 * sets/replaces it; `null` removes password protection. Takes effect at once —
 * the returned link view reflects the new `requiresPassword`. The value itself is
 * request-only: never stored client-side, cached, logged, or echoed back.
 */
export function updateShareLinkPassword(
  documentId: string,
  linkId: string,
  password: string | null,
): Promise<ShareLink> {
  return apiFetch<ShareLink>(authPath(documentId, `/${encodeURIComponent(linkId)}/password`), {
    method: 'PUT',
    json: { password },
    token: getToken() ?? undefined,
  });
}

/** The row trigger label: view when a password is set, set when the link is open. */
export function passwordTriggerLabel(t: WebTranslate, requiresPassword: boolean): string {
  return t(requiresPassword ? 'contracts.linkPasswordOpen' : 'contracts.linkPasswordSet');
}

/** The hint that explains a link's current password state in the editor panel. */
export function passwordStateHint(t: WebTranslate, view: ShareLinkPasswordView): string {
  if (!view.hasPassword) return t('contracts.linkPasswordHintNone');
  return t(view.recoverable ? 'contracts.linkPasswordHint' : 'contracts.linkPasswordHintLegacy');
}

/**
 * The value the editor field starts with for a given password state: the
 * confirmable plaintext when recoverable, otherwise empty (no password / legacy
 * hash we can't show).
 */
export function passwordEditorInitialValue(view: ShareLinkPasswordView): string {
  return view.hasPassword && view.recoverable ? (view.password ?? '') : '';
}

// --- validity presets -------------------------------------------------------

/** A single-select validity option in the create modal. */
export interface ExpiryPreset {
  key: string;
  /** Catalog key of the label, so the option carries no language of its own. */
  labelKey: WebTranslationKey;
  /** Window in days, or null when the link never expires. */
  days: number | null;
}

/** Order + default (1 week) per design-spec `components/share-link-dialog`. */
export const EXPIRY_PRESETS = [
  { key: '1d', labelKey: 'contracts.linkExpiry1Day', days: 1 },
  { key: '3d', labelKey: 'contracts.linkExpiry3Days', days: 3 },
  { key: '1w', labelKey: 'contracts.linkExpiry1Week', days: 7 },
  { key: '1m', labelKey: 'contracts.linkExpiry1Month', days: 30 },
  { key: 'none', labelKey: 'contracts.linkExpiryNone', days: null },
] as const satisfies readonly ExpiryPreset[];

export const DEFAULT_EXPIRY_PRESET_KEY = '1w';

/** Look up a preset by key, falling back to the default (1 week). */
export function findExpiryPreset(key: string): ExpiryPreset {
  return (
    EXPIRY_PRESETS.find((p) => p.key === key) ??
    EXPIRY_PRESETS.find((p) => p.key === DEFAULT_EXPIRY_PRESET_KEY) ??
    EXPIRY_PRESETS[0]
  );
}

/** Map a chosen preset to the create-call's expiry fields. */
export function expiryInput(preset: ExpiryPreset): Pick<CreateShareLinkInput, 'expiresInDays' | 'noExpiry'> {
  return preset.days == null ? { noExpiry: true } : { expiresInDays: preset.days };
}

/** Calendar-date locales, one per supported UI locale. */
const DATE_LOCALES: Readonly<Record<SupportedLocale, string>> = { ko: 'ko-KR', en: 'en-US' };

/**
 * The zone every share-link deadline is expressed in.
 *
 * Pinned rather than read from the reader's device on purpose: expiry is a
 * server-side boundary computed in KST, so a link that dies on July 3rd must not
 * read as July 2nd to a sender travelling with their laptop clock. Only the
 * *language* of the date follows the locale; the instant it names does not.
 */
const EXPIRY_TIME_ZONE = 'Asia/Seoul';

/** Format an ISO expiry instant as a calendar date in the reader's language. */
export function formatExpiryDate(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: EXPIRY_TIME_ZONE,
  }).format(new Date(iso));
}

/**
 * The expiry line under a link: when it stops working, or that it never does.
 *
 * Two whole sentences rather than one sentence with an optional clause — a
 * link with no deadline is a different fact, not a missing date.
 */
export function expiryNote(
  t: WebTranslate,
  locale: SupportedLocale,
  link: Pick<ShareLink, 'expiresAt'>,
): string {
  return link.expiresAt
    ? t('contracts.linkExpiryNote', { date: formatExpiryDate(link.expiresAt, locale) })
    : t('contracts.linkNoExpiryNote');
}

/** Sender-facing label for a link's lifecycle state (the row's state pill). */
export function shareLinkStateLabel(t: WebTranslate, state: ShareLinkState): string {
  return t(SHARE_LINK_STATE_KEYS[state]);
}

const SHARE_LINK_STATE_KEYS: Readonly<Record<ShareLinkState, WebTranslationKey>> = {
  active: 'contracts.linkStateActive',
  expired: 'contracts.linkStateExpired',
  revoked: 'contracts.linkStateRevoked',
  completed: 'contracts.linkStateCompleted',
};

/** Copy/clipboard helper that surfaces a friendly failure when blocked. */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('clipboard-unavailable');
  }
  await navigator.clipboard.writeText(text);
}
