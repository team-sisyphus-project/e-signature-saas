/**
 * Recipient-side API client for the public link-share flow.
 *
 * Wraps the JWT-free `/share/:token/...` endpoints (see
 * `apps/api/src/sharing/share-public.controller.ts`). Response shapes mirror the
 * server's DTOs so the recipient UI binds to them directly. `:token` is the LINK
 * SignRequest access token embedded in the share link.
 *
 * The short-lived *share session* token (issued on `/unlock`) is the bearer for
 * the session-guarded calls. It is persisted per access token in `sessionStorage`
 * (a separate `esign.share.` namespace from the OTP signer's `esign.signer.`) so a
 * reload inside the same tab can resume, while it never outlives the tab.
 *
 * User-facing access/error copy is owned by the server (`MESSAGES.share`) and
 * surfaced verbatim through `ApiError`. The screen chrome authored client-side
 * lives in the `share` domain of the browser catalog (`lib/i18n/share.ts`) and
 * mirrors the server catalog's Toss voice — the same single-source pattern the
 * `signer` domain follows.
 *
 * Security: the link password is request-only. It is passed straight to `/unlock`
 * and never stored, cached, logged, or echoed — the server hashes it at rest and
 * only ever returns `requiresPassword` (a boolean).
 */

import { ApiError, apiFetch, apiUrl } from './api';
import { linkLocaleQuery } from './locale';
import type { SignFieldType, SignerSender, SignRequestStatus } from './signing';
import type { WebTranslationKey } from './web-translations';

// --- response shapes (mirror SharingService return types) --------------------

/** Pre-auth metadata for the share landing screen (no PDF / fields). */
export interface ShareMeta {
  documentTitle: string;
  sender: SignerSender;
  /** Server-resolved public-link locale, useful to non-React consumers. */
  locale: 'ko' | 'en';
  /** Whether `/unlock` requires the link password (the value is never returned). */
  requiresPassword: boolean;
  /** ISO expiry instant, or null when the link never expires. */
  expiresAt: string | null;
  /** True once the recipient has already submitted (a terminal state). */
  alreadySubmitted: boolean;
}

export interface ShareUnlockResult {
  sessionToken: string;
}

/** A recipient's assigned field with normalized (0..1) geometry. */
export interface SharePayloadField {
  id: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
}

export interface SharePayload {
  documentTitle: string;
  pageCount: number;
  pdfPath: string;
  fields: SharePayloadField[];
}

export interface ShareSubmitResult {
  status: SignRequestStatus;
  /** True when this submission completed the document as a whole. */
  documentCompleted: boolean;
  message: string;
}

// --- session token persistence (tab-scoped, `esign.share.` namespace) --------

const SESSION_PREFIX = 'esign.share.';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function sessionKey(accessToken: string): string {
  return `${SESSION_PREFIX}${accessToken}`;
}

/** Persist the share session token for this link (tab-scoped, best-effort). */
export function setShareSession(accessToken: string, sessionToken: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(sessionKey(accessToken), sessionToken);
  } catch {
    // Storage may be unavailable (private mode / quota); the token also lives in
    // memory for the active flow, so persistence is a convenience only.
  }
}

export function getShareSession(accessToken: string): string | null {
  if (!isBrowser()) return null;
  try {
    return sessionStorage.getItem(sessionKey(accessToken));
  } catch {
    return null;
  }
}

export function clearShareSession(accessToken: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(sessionKey(accessToken));
  } catch {
    // Nothing to recover from — see setShareSession.
  }
}

// --- endpoints ---------------------------------------------------------------

const base = (accessToken: string) => `/share/${encodeURIComponent(accessToken)}`;

/**
 * ① Pre-auth metadata for the landing/gate screen. `linkLocale` is the link's own
 * `?lang=` value; forwarding it lets the server resolve `meta.locale` from the
 * same tier the browser applies.
 */
export function fetchShareMeta(accessToken: string, linkLocale?: string): Promise<ShareMeta> {
  return apiFetch<ShareMeta>(`${base(accessToken)}${linkLocaleQuery(linkLocale)}`);
}

/**
 * ② Open the link → receive a short-lived share session token. Pass the password
 * only when the link requires one; an open link unlocks immediately.
 */
export function unlockShare(
  accessToken: string,
  password?: string,
): Promise<ShareUnlockResult> {
  return apiFetch<ShareUnlockResult>(`${base(accessToken)}/unlock`, {
    method: 'POST',
    json: password ? { password } : {},
  });
}

/** ③ The recipient's fields + PDF path (session required). */
export function fetchSharePayload(
  accessToken: string,
  sessionToken: string,
): Promise<SharePayload> {
  return apiFetch<SharePayload>(`${base(accessToken)}/payload`, { token: sessionToken });
}

/** ④ Absolute URL of the session-guarded PDF byte stream (opened by the viewer). */
export function sharePdfUrl(accessToken: string): string {
  return apiUrl(`${base(accessToken)}/pdf`);
}

/** ⑤ Persist captured field values (session required). */
export function saveShareFields(
  accessToken: string,
  sessionToken: string,
  fields: { fieldId: string; value: string }[],
): Promise<{ saved: number }> {
  return apiFetch<{ saved: number }>(`${base(accessToken)}/fields`, {
    method: 'POST',
    token: sessionToken,
    json: { fields },
  });
}

/** ⑥ Finalize the recipient's submission (session required). */
export function submitShare(
  accessToken: string,
  sessionToken: string,
): Promise<ShareSubmitResult> {
  return apiFetch<ShareSubmitResult>(`${base(accessToken)}/submit`, {
    method: 'POST',
    token: sessionToken,
  });
}

// --- terminal (blocked) state mapping ----------------------------------------
//
// The single source for the recipient's terminal decision surface: HTTP status →
// block reason → notice copy + tone. It mirrors the server catalog so the calm
// voice (no blame, one next-step sentence) and the 410/403/404 mapping stay
// auditable. Copy rules: design-spec `messaging/public-flow-copy.md`.

/**
 * Why a share link can't be opened/filled — the recipient's terminal "blocked"
 * reasons. Each renders a `notice-screen` with a calm message + matching tone.
 */
export type ShareBlockReason =
  | 'expired'
  | 'disabled'
  | 'invalidLink'
  | 'notSignable'
  | 'alreadySubmitted';

/** Tone of a terminal notice: a positive (completed) outcome vs. a neutral end. */
export type ShareNoticeTone = 'success' | 'neutral';

export interface ShareNotice {
  /** Catalog key of the notice headline. */
  titleKey: WebTranslationKey;
  /** Catalog key of the single guiding sentence below it. */
  bodyKey: WebTranslationKey;
  tone: ShareNoticeTone;
}

/**
 * Terminal copy + tone per blocked reason, as catalog keys — the single source
 * `ShareFlow` renders from. The bodies mirror the server's `MESSAGES.share`
 * catalog. Only an "already submitted" link is a positive/success outcome; the
 * rest are calm, neutral dead-ends — the sender's branding is kept either way.
 *
 * Keys rather than sentences, so a recipient who switches language on a dead-end
 * screen reads the new language rather than the one the notice was built in.
 */
export const SHARE_NOTICE: Record<ShareBlockReason, ShareNotice> = {
  expired: {
    titleKey: 'share.noticeExpiredTitle',
    bodyKey: 'share.noticeExpiredBody',
    tone: 'neutral',
  },
  disabled: {
    titleKey: 'share.noticeDisabledTitle',
    bodyKey: 'share.noticeDisabledBody',
    tone: 'neutral',
  },
  invalidLink: {
    titleKey: 'share.noticeInvalidLinkTitle',
    bodyKey: 'share.noticeInvalidLinkBody',
    tone: 'neutral',
  },
  notSignable: {
    titleKey: 'share.noticeNotSignableTitle',
    bodyKey: 'share.noticeNotSignableBody',
    tone: 'neutral',
  },
  alreadySubmitted: {
    titleKey: 'share.noticeSubmittedTitle',
    bodyKey: 'share.noticeSubmittedBody',
    tone: 'success',
  },
};

/**
 * Map a pre-auth meta failure (the landing fetch guards revocation + expiry) to
 * its terminal reason, mirroring the server's HTTP codes:
 *   • 410 Gone      → expired (past its validity window)
 *   • 404 Not Found → invalidLink (missing token / not a LINK)
 *   • 403 Forbidden → disabled (revoked by the sender)
 *   • anything else → invalidLink (safe default)
 */
export function metaBlockReason(error: unknown): ShareBlockReason {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 410) return 'expired';
  if (status === 404) return 'invalidLink';
  if (status === 403) return 'disabled';
  return 'invalidLink';
}

/**
 * Map an open-link auto-unlock failure (no gate to retry on). Meta already
 * cleared revocation/expiry, so a 403 here means the contract is no longer
 * fillable; anything else falls back to invalidLink.
 */
export function unlockBlockReason(error: unknown): ShareBlockReason {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) return 'notSignable';
  return 'invalidLink';
}
