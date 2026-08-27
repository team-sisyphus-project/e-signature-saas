/**
 * Completion-download domain helpers shared by the sender dashboard and the
 * signer completion screen.
 *
 * Holds the artifact taxonomy, its catalog keys, and the small browser
 * "save this blob" plumbing, so both surfaces name the two artifacts identically
 * and behave the same. The sentences themselves live in the `common` catalog
 * domain — three domains render this one component, so none of them owns it.
 * The actual byte fetch lives next to each caller's auth (owner JWT in
 * `documents.ts`, signer session token in `signing.ts`).
 */

import type { WebTranslationKey } from './web-translations';

/** The two downloadable completion outputs (mirrors the server's union). */
export type CompletionArtifact = 'signed' | 'certificate';

/**
 * Catalog keys for the two downloadable artifacts.
 *
 * The names mirror voice.md §4 attachment names so the inbox and the dashboard
 * agree. Keys rather than sentences: the same rows are rendered on the sender's
 * dashboard, the contract detail page, and the signer's completion takeover, and
 * a language switch must relabel all three.
 */
export const COMPLETION_ARTIFACT_KEYS = {
  signed: {
    title: 'common.completionSigned',
    description: 'common.completionSignedDescription',
  },
  certificate: {
    title: 'common.completionCertificate',
    description: 'common.completionCertificateDescription',
  },
} as const satisfies Record<
  CompletionArtifact,
  { title: WebTranslationKey; description: WebTranslationKey }
>;

/** Ordered list of artifacts for rendering the two download rows. */
export const COMPLETION_ARTIFACTS: CompletionArtifact[] = ['signed', 'certificate'];

/**
 * Format an ISO timestamp as the absolute KST label `YYYY.MM.DD HH:mm (KST)`
 * (voice.md §2). Returns an empty string for an unparseable input.
 */
export function formatKstDateTime(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  // Shift to KST (UTC+9) and read the UTC parts of the shifted instant.
  const kst = new Date(ms + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${kst.getUTCFullYear()}.${p(kst.getUTCMonth() + 1)}.${p(kst.getUTCDate())}`;
  const time = `${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
  return `${date} ${time} (KST)`;
}

/** Trigger a browser "save file" for a downloaded blob (best-effort filename). */
export function saveBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been dispatched.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
