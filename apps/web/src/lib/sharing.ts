/**
 * Share-link data access for the sender.
 *
 * Typed wrappers over the owner-scoped `/documents/:id/share-links` endpoints
 * (see `apps/api/src/sharing/sharing.controller.ts`). Response shapes mirror the
 * server's `ShareLinkView` so the detail screen binds to them directly.
 *
 * Copy lives here as a single source of truth (like `SIGNER_COPY` /
 * `CONTRACT_DETAIL_COPY`), authored from design-spec `messaging/share-link.md`.
 * The validity presets are config + copy paired in one place.
 *
 * Security: a link password is request-only. It is passed straight to the create
 * call and never stored, cached, logged, or echoed back — the server hashes it
 * at rest and only ever returns `requiresPassword` (a boolean).
 */

import { apiFetch } from './api';
import { getToken } from './auth';

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
  /** ISO expiry instant, or null for "no expiry". */
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Settings for a new link. Password is plaintext in-flight only — see module note. */
export interface CreateShareLinkInput {
  /** Validity window in days. Ignored when `noExpiry` is true. */
  expiresInDays?: number;
  /** True ⇒ the link never expires ("no expiry"). */
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

/** Reveal a link's current access password to its owner (dashboard "view"). */
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
 * Replace or clear a link's access password (dashboard "edit"). A non-empty value
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

/** The row trigger label: "View password" when set, "Set password" when open. */
export function passwordTriggerLabel(requiresPassword: boolean): string {
  return requiresPassword
    ? SHARE_COPY.passwordAdmin.open
    : SHARE_COPY.passwordAdmin.openUnset;
}

/** The hint that explains a link's current password state in the editor panel. */
export function passwordStateHint(view: ShareLinkPasswordView): string {
  if (!view.hasPassword) return SHARE_COPY.passwordAdmin.hintNone;
  return view.recoverable
    ? SHARE_COPY.passwordAdmin.hintRecoverable
    : SHARE_COPY.passwordAdmin.hintLegacy;
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
  label: string;
  /** Window in days, or null for "no expiry". */
  days: number | null;
}

/** Order + default ("1 week") per design-spec `components/share-link-dialog`. */
export const EXPIRY_PRESETS = [
  { key: '1d', label: '1 day', days: 1 },
  { key: '3d', label: '3 days', days: 3 },
  { key: '1w', label: '1 week', days: 7 },
  { key: '1m', label: '1 month', days: 30 },
  { key: 'none', label: 'No expiry', days: null },
] as const satisfies readonly ExpiryPreset[];

export const DEFAULT_EXPIRY_PRESET_KEY = '1w';

/** Look up a preset by key, falling back to the default ("1 week"). */
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

/** Format an ISO expiry instant as a calendar date ("July 3, 2026", KST). */
export function formatExpiryDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso));
}

/** The expiry notice line for a created link (`messaging/share-link`). */
export function expiryNote(link: Pick<ShareLink, 'expiresAt'>): string {
  return link.expiresAt
    ? `This link can be opened until ${formatExpiryDate(link.expiresAt)}.`
    : 'This link stays open with no expiry.';
}

// --- copy (design-spec messaging/share-link.md) -----------------------------

export const SHARE_COPY = {
  header: {
    title: 'Share via link',
    description: 'Anyone with the link can open and fill out the contract.',
  },
  expiry: {
    label: 'Validity period',
    help: 'The link expires automatically once the validity period ends.',
  },
  password: {
    toggle: 'Protect with a password',
    label: 'Password',
    placeholder: 'Enter a password',
    hint: 'This password is required to open the contract. Share it with the recipient separately.',
    /** Client-side guard before the server rejects a too-short password. */
    tooShort: `The password must be at least ${SHARE_PASSWORD_MIN_LENGTH} characters.`,
  },
  generate: {
    idle: 'Create link',
    loading: 'Creating',
  },
  result: {
    linkLabel: 'Share link',
    copy: 'Copy',
    copied: 'Copied',
    /** Brief confirmation surfaced to assistive tech via role="status". */
    copyToast: 'Link copied',
  },
  errors: {
    create: 'We could not create the link. Please try again shortly.',
    copy: 'We could not copy the link. Please select and copy it manually.',
  },
  /**
   * Copy for the create wizard's link-share terminal step (shares the same body as
   * the modal, but adds a step header + a "done" confirmation and a
   * dashboard hand-off, matching the review step's success tone).
   */
  wizard: {
    title: 'Share via link',
    intro: 'Choose a validity period and password, and we will create your share link.',
    done: 'Your link is ready. Copy it and send it to the recipient.',
    toDashboard: 'Go to dashboard',
  },
  /** Sender-facing labels for a link's lifecycle state (list pills). */
  state: {
    active: 'Active',
    expired: 'Expired',
    revoked: 'Disabled',
    completed: 'Submitted',
  } satisfies Record<ShareLinkState, string>,
  list: {
    /** Title for the live link list once links exist. */
    heading: 'Created links',
    revoke: 'Disable',
    revoking: 'Disabling',
    revokeAria: (label: string) => `Disable the ${label} link`,
    passwordTag: 'Password',
    loadError: 'We could not load the link list. Please try again shortly.',
    revokeError: 'We could not disable the link. Please try again shortly.',
  },
  /**
   * Copy for the dashboard's per-link password view/edit panel (grain-3).
   * Owner-only client surface, so it lives here beside the other sender-facing
   * link copy. Tone follows the project messaging convention (no blame, point to
   * the next action, never expose internals).
   */
  passwordAdmin: {
    /** Row trigger — label depends on whether a password is already set. */
    open: 'View password',
    openUnset: 'Set password',
    close: 'Close',
    /** Announced while the current password is being fetched. */
    loading: 'Loading',
    label: 'Password',
    placeholder: 'Enter a password',
    /** State-dependent hints (see `passwordStateHint`). */
    hintNone: 'No password is set. Enter a new password to protect this link.',
    hintRecoverable:
      'This password is required to open the contract. Share it with the recipient separately.',
    hintLegacy:
      'The previously set password cannot be viewed. Set a new password to make it viewable again.',
    save: 'Save',
    saving: 'Saving',
    remove: 'Remove password',
    removing: 'Removing',
    /** Client-side guard mirroring the create field's min-length rule. */
    tooShort: `The password must be at least ${SHARE_PASSWORD_MIN_LENGTH} characters.`,
    /** Feedback surfaced after a successful save/remove (role="status"). */
    savedSet: 'Password set.',
    savedChanged: 'Password changed.',
    savedRemoved: 'Password protection removed.',
    /** Non-server-roundtrip failures (the panel prefers ApiError.message). */
    loadError: 'We could not load the password. Please try again shortly.',
    saveError: 'We could not save the password. Please try again shortly.',
    /** Accessible name for the row trigger, disambiguated by the link's label. */
    triggerAria: (label: string) => `Manage the password for the ${label} link`,
  },
} as const;

/** Copy/clipboard helper that surfaces a friendly failure when blocked. */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('clipboard-unavailable');
  }
  await navigator.clipboard.writeText(text);
}
