/**
 * Client-side validation for branding image assets (logo · favicon).
 *
 * Pure, DOM-free constants plus a single validate function, so the rules are
 * unit testable and shared by every image uploader. There is no network here:
 * this only decides whether a picked file may be previewed and held locally —
 * persisting it is the branding form's concern.
 *
 * Like the wizard's PDF guard, the validator returns the **catalog key** of the
 * rule a file trips rather than a sentence. Deciding *what is wrong* is a rule;
 * deciding *what language the reader sees it in* is a rendering concern, and
 * mixing the two would make the rule untestable without picking a locale.
 */

import type { WebTranslationKey } from './web-translations';

/** Accepted image MIME types for branding assets. */
export const ACCEPTED_IMAGE_TYPES = ['image/svg+xml', 'image/png'] as const;

/**
 * Accepted file extensions — the fallback when a browser reports an empty or
 * unexpected MIME type for a valid file (some environments hand SVGs an empty
 * `type`). Mirrors the wizard's `type || .ext` leniency.
 */
export const ACCEPTED_IMAGE_EXTENSIONS = ['.svg', '.png'] as const;

/**
 * Size cap, in whole megabytes. Exported because the same number appears in the
 * uploader's constraint hint, the "already set" hints, and the too-large
 * message: a cap that states one number and enforces another is worse than no
 * cap at all, so every sentence takes this value through a `{limit}` slot.
 */
export const MAX_IMAGE_MB = 1;

/** Maximum branding image size in bytes. */
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

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
 * Catalog keys for the three guards, so a caller can name a rule without
 * resolving it. The uploader renders them with `{ limit: MAX_IMAGE_MB }`.
 */
export const IMAGE_GUARD_KEYS = {
  invalidType: 'settings.imageInvalidType',
  empty: 'settings.imageEmpty',
  tooLarge: 'settings.imageTooLarge',
} as const satisfies Record<string, WebTranslationKey>;

/** The `accept` attribute value for the file input (MIME types + extensions). */
export const IMAGE_ACCEPT_ATTR = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_IMAGE_EXTENSIONS].join(',');

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Validate a picked image against the branding constraints. Returns the catalog
 * key of the guard it trips, or `null` when the file is acceptable.
 *
 * Order is deliberate — type → empty → size — so the most fundamental problem
 * surfaces first (a `.jpg` reads as "wrong format", not "too large").
 */
export function validateImageFile(file: ValidatedFile): WebTranslationKey | null {
  const typeOk =
    (file.type !== '' && (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) ||
    hasAcceptedExtension(file.name);
  if (!typeOk) return IMAGE_GUARD_KEYS.invalidType;
  if (file.size === 0) return IMAGE_GUARD_KEYS.empty;
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_GUARD_KEYS.tooLarge;
  return null;
}

/**
 * Byte count as a short human size. Units stay in ASCII (B / KB / MB), which
 * read the same in both locales — locale-aware number formatting is outside the
 * i18n scope, and inventing a translated unit here would only fragment it.
 */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
