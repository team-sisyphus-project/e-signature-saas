/**
 * Signer-side API client for the public signing flow.
 *
 * Wraps the JWT-free `/signing/:token/...` endpoints (see
 * `apps/api/src/signing/signing.controller.ts`). Response shapes mirror the
 * server's DTOs so the signer UI binds to them directly. `:token` is the
 * SignRequest access token embedded in the signing link.
 *
 * The short-lived signer *session* token (issued on code verification) is the
 * bearer for the session-guarded calls. We persist it per access token in
 * `sessionStorage` so a reload inside the same tab can resume, while it never
 * outlives the tab — matching the 30-minute, single-use nature of the session.
 *
 * User-facing error copy is owned by the server (`common/messages.ts`) and
 * surfaced verbatim through `ApiError`. The strings authored client-side (screen
 * headings, the viewer chrome, the terminal flag screens) live in the `signer`
 * domain of the browser catalog (`lib/i18n/signer.ts`) and intentionally mirror
 * the server's signing catalog so the voice stays one.
 */

import { ApiError, apiDownload, apiFetch, apiUrl } from './api';
import { linkLocaleQuery } from './locale';
import { translateWeb } from './web-translations';
import {
  COMPLETION_ARTIFACT_KEYS,
  saveBlob,
  type CompletionArtifact,
} from './completion-download';

// --- shared status unions (mirror the Prisma enums; web stays server-free) ---

export type SignRequestStatus = 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';
export type SigningDocumentStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type SignFieldType = 'SIGNATURE' | 'DATE' | 'TEXT';

// --- response shapes (mirror SigningService return types) --------------------

export interface SignerSender {
  name: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  locale: 'ko' | 'en';
}

/** Pre-verification metadata for the landing screen (no PDF / fields). */
export interface SigningMeta {
  documentTitle: string;
  pageCount: number;
  documentStatus: SigningDocumentStatus;
  sender: SignerSender;
  /** Server-resolved public-link locale, useful to non-React consumers. */
  locale: 'ko' | 'en';
  recipientNameMasked: string | null;
  status: SignRequestStatus;
  alreadySigned: boolean;
  signable: boolean;
}

export interface VerifyResult {
  sessionToken: string;
  status: SignRequestStatus;
}

/** A signer's assigned field with normalized (0..1) geometry. */
export interface SigningPayloadField {
  id: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
}

export interface SigningPayload {
  documentTitle: string;
  pageCount: number;
  pdfPath: string;
  fields: SigningPayloadField[];
}

// --- session token persistence ----------------------------------------------

const SESSION_PREFIX = 'esign.signer.';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function sessionKey(accessToken: string): string {
  return `${SESSION_PREFIX}${accessToken}`;
}

/** Persist the signer session token for this link (tab-scoped). */
export function setSignerSession(accessToken: string, sessionToken: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(sessionKey(accessToken), sessionToken);
  } catch {
    // Storage may be unavailable (private mode / quota). The token also lives in
    // memory for the active flow, so persistence is a best-effort convenience.
  }
}

export function getSignerSession(accessToken: string): string | null {
  if (!isBrowser()) return null;
  try {
    return sessionStorage.getItem(sessionKey(accessToken));
  } catch {
    return null;
  }
}

export function clearSignerSession(accessToken: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(sessionKey(accessToken));
  } catch {
    // Nothing to recover from — see setSignerSession.
  }
}

// --- endpoints ---------------------------------------------------------------

const base = (accessToken: string) => `/signing/${encodeURIComponent(accessToken)}`;

/**
 * ① Pre-auth metadata for the landing screen. `linkLocale` is the link's own
 * `?lang=` value; forwarding it lets the server resolve `meta.locale` from the
 * same tier the browser applies.
 */
export function fetchMeta(accessToken: string, linkLocale?: string): Promise<SigningMeta> {
  return apiFetch<SigningMeta>(`${base(accessToken)}${linkLocaleQuery(linkLocale)}`);
}

/** ② Verify the 6-digit code → receive a short-lived session token. */
export function verifyCode(accessToken: string, code: string): Promise<VerifyResult> {
  return apiFetch<VerifyResult>(`${base(accessToken)}/verify`, {
    method: 'POST',
    json: { code },
  });
}

/** ③ The signer's fields + PDF path (session required). */
export function fetchPayload(
  accessToken: string,
  sessionToken: string,
): Promise<SigningPayload> {
  return apiFetch<SigningPayload>(`${base(accessToken)}/payload`, {
    token: sessionToken,
  });
}

/**
 * ④ Absolute URL of the session-guarded PDF byte stream. The viewer opens it
 * via `loadPdfFromUrl` with the session token as a bearer header (the bytes are
 * binary, so this bypasses the JSON `apiFetch` path).
 */
export function signerPdfUrl(accessToken: string): string {
  return apiUrl(`${base(accessToken)}/pdf`);
}

/** One captured value to persist: the field id + its serialized string value. */
export interface FieldValueInput {
  fieldId: string;
  /** Signature PNG data URL / ISO `YYYY-MM-DD` date / non-empty text. */
  value: string;
}

/**
 * ⑤ Persist captured field values (session required). The server validates each
 * value against its field type (signature dataURL / ISO date / text) and writes
 * only fields assigned to this signer. Returns how many were saved.
 */
export function saveFields(
  accessToken: string,
  sessionToken: string,
  fields: FieldValueInput[],
): Promise<{ saved: number }> {
  return apiFetch<{ saved: number }>(`${base(accessToken)}/fields`, {
    method: 'POST',
    token: sessionToken,
    json: { fields },
  });
}

/** Result of finalizing the signer's part (mirrors SigningService.complete). */
export interface CompleteResult {
  status: SignRequestStatus;
  /** True when this was the last outstanding signer — the whole doc is now done. */
  documentCompleted: boolean;
  message: string;
}

/**
 * ⑥ Finalize the signer's part (session required). The server requires every
 * assigned field filled, flips the SignRequest to SIGNED, and reports whether
 * the document as a whole is now complete. Rejects with the server's Toss-tone
 * message (e.g. an incomplete/expired/already-signed state) so the viewer can
 * surface a friendly retry without losing the captured signature.
 */
export function completeSigning(
  accessToken: string,
  sessionToken: string,
): Promise<CompleteResult> {
  return apiFetch<CompleteResult>(`${base(accessToken)}/complete`, {
    method: 'POST',
    token: sessionToken,
  });
}

/**
 * ⑦ Download a completed contract's artifact as the signer and hand it to the
 * browser's "save file". Requires the active signer session (issued on code
 * verification); a missing session rejects with a neutral retry message. Rejects
 * with the server's Toss-tone message when the artifacts aren't ready yet.
 */
export async function downloadSignerArtifact(
  accessToken: string,
  kind: CompletionArtifact,
  fallbackTitle: string,
  locale: 'ko' | 'en' = 'ko',
): Promise<void> {
  const session = getSignerSession(accessToken);
  if (!session) throw new ApiError(translateWeb(locale, 'signer.completeError'), 401);

  const { blob, filename } = await apiDownload(`${base(accessToken)}/download/${kind}`, {
    token: session,
  });
  const artifactName = translateWeb(locale, COMPLETION_ARTIFACT_KEYS[kind].title);
  saveBlob(blob, filename ?? `${fallbackTitle} (${artifactName}).pdf`);
}

/**
 * Serialize a captured signer value into the server's string contract:
 * signature → data URL, text/date → the raw string. Returns `null` for an
 * empty/unsupported value (nothing to persist).
 */
export function serializeFieldValue(value: {
  type: SignFieldType;
  dataUrl?: string;
  text?: string;
}): string | null {
  if (value.type === 'SIGNATURE') return value.dataUrl ?? null;
  const text = value.text?.trim();
  return text ? text : null;
}
