/**
 * Completion artifact identity — the two PDFs produced when a contract finishes.
 *
 * Single source of truth for which artifacts exist, their user-facing names
 * (voice.md §4: "최종 계약서" / "감사 추적 인증서"), and the email-attachment /
 * download filename format. Shared by the completion pipeline (grain-5) and the
 * download endpoints (grain-6) so the naming never diverges between the copy a
 * participant sees in their inbox and the file they pull from the dashboard.
 *
 * The names themselves live in the server translation catalog, not here: an
 * attachment list is the first thing an English recipient reads, so a filename
 * is user-facing copy and obeys the same rule as every other user-facing
 * string — it is looked up per locale, never inlined.
 */

import { translate, type TranslationKey } from '../i18n/server-translations';
import type { SupportedLocale } from '../i18n/locale-resolver';

/** The two downloadable completion outputs. */
export type CompletionArtifact = 'signed' | 'certificate';

/** Catalog key holding each artifact's display name (voice.md §4). */
const ARTIFACT_LABEL_KEY: Record<CompletionArtifact, TranslationKey> = {
  signed: 'artifact.finalContract',
  certificate: 'artifact.auditCertificate',
};

/** Narrow an untrusted route param to a known artifact kind, or null. */
export function parseArtifactKind(value: string): CompletionArtifact | null {
  return value === 'signed' || value === 'certificate' ? value : null;
}

/**
 * Build a readable, filesystem-safe download/attachment name from the title.
 *
 * `locale` is required rather than defaulted: a default would let a new call
 * site ship Korean attachment names to English recipients silently, which is
 * exactly the regression this catalog exists to prevent. Callers must decide
 * whose language the file is named in — see the completion pipeline and the two
 * download endpoints.
 *
 * The title is the sender's own words and is never translated; only the
 * bracketed artifact label and the empty-title fallback are.
 */
export function artifactFilename(
  title: string,
  kind: CompletionArtifact,
  locale: SupportedLocale,
): string {
  const safe =
    title
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || translate(locale, 'artifact.untitled');
  return `${safe} (${translate(locale, ARTIFACT_LABEL_KEY[kind])}).pdf`;
}
