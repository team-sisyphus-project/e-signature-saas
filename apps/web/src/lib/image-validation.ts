/**
 * Client-side image validation for branding assets (logo and favicon).
 *
 * Pure, DOM-free constants + a single validate function so the rules are unit
 * testable and shared by every image uploader. There is no network here — the
 * actual upload / persistence is the branding form's concern (a later grain);
 * this only decides whether a picked file may be previewed and held locally.
 *
 * Guard copy mirrors the wizard PDF guard (see `GUARD` in
 * components/wizard/upload-step.tsx): plain fact + next action, no blame —
 * the project base voice (design-spec/messaging/recording.md).
 */

/** Accepted image MIME types for branding assets. */
export const ACCEPTED_IMAGE_TYPES = ['image/svg+xml', 'image/png'] as const;

/**
 * Accepted file extensions — the fallback when a browser reports an empty or
 * unexpected MIME type for a valid file (some environments hand SVGs an empty
 * `type`). Mirrors the wizard's `type || .ext` leniency.
 */
export const ACCEPTED_IMAGE_EXTENSIONS = ['.svg', '.png'] as const;

/** Human-facing accepted formats, woven into hints/error copy. */
export const ACCEPTED_IMAGE_LABEL = 'SVG or PNG';

/** Maximum branding image size in bytes (1MB). */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** Human-facing max size, woven into hints/error copy. */
export const MAX_IMAGE_SIZE_LABEL = '1MB';

/**
 * The minimal file shape the validator needs. A real DOM `File` satisfies this,
 * so callers pass files directly; tests pass plain objects (no DOM required).
 */
export interface ValidatedFile {
  name: string;
  type: string;
  size: number;
}

/**
 * Guard copy — `{what happened (without blame)} + {next action}`.
 * The single source for the uploader's inline error messages.
 */
export const IMAGE_VALIDATION_COPY = {
  invalidType: `Only ${ACCEPTED_IMAGE_LABEL} files can be uploaded. Please try again with a different file.`,
  empty: 'The file is empty. Please try again with a different file.',
  tooLarge: `The file is too large. Please upload a ${ACCEPTED_IMAGE_LABEL} file under ${MAX_IMAGE_SIZE_LABEL}.`,
} as const;

/** Constraint hint shown under the uploader by default (formats · max size). */
export const IMAGE_CONSTRAINT_HINT = `${ACCEPTED_IMAGE_LABEL} · up to ${MAX_IMAGE_SIZE_LABEL}`;

/** The `accept` attribute value for the file input (MIME types + extensions). */
export const IMAGE_ACCEPT_ATTR = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_IMAGE_EXTENSIONS].join(',');

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Validate a picked image against the branding constraints. Returns a guard
 * message, or `null` when the file is acceptable.
 *
 * Order is deliberate — type → empty → size — so the most fundamental problem
 * surfaces first (a `.jpg` reads as "wrong format", not "too large").
 */
export function validateImageFile(file: ValidatedFile): string | null {
  const typeOk =
    (file.type !== '' && (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) ||
    hasAcceptedExtension(file.name);
  if (!typeOk) return IMAGE_VALIDATION_COPY.invalidType;
  if (file.size === 0) return IMAGE_VALIDATION_COPY.empty;
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_VALIDATION_COPY.tooLarge;
  return null;
}

/** Format a byte count as a short human string (e.g. `240 KB`, `1.0 MB`). */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
