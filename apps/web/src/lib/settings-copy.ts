/**
 * Settings section copy — the single source of truth for the settings shell's
 * user-facing strings (section title, navigation labels, entry-point label, and
 * each sub-section's intro). Kept here so structure/tone stay consistent and
 * auditable, mirroring `lib/todo-copy.ts` / `lib/onboarding-copy.ts`.
 *
 * Tone follows the project base voice (design-spec/messaging/recording.md):
 * plain, calm, action-forward. Labels are short nouns.
 */

/** A single item in the settings navigation. `href` is the sub-section route. */
export interface SettingsNavItem {
  /** Route this item links to, e.g. `/settings/branding`. */
  href: string;
  /** Menu label, e.g. `Branding`. */
  label: string;
}

/**
 * App header brand mark copy. The shared header (`DashboardHeader`) shows the
 * uploaded branding logo as an image when one is set, otherwise the eSign
 * wordmark. Centralized here — the same module that owns the settings entry
 * point, which lives in that header — so the service name and the logo's alt
 * text stay consistent and auditable. Tone follows the project base voice.
 */
export const HEADER_BRAND_COPY = {
  /** Wordmark shown in the header when no branding logo is set. */
  wordmark: 'eSign',
  /** Alt text for the branding logo image (a11y: names the service mark). */
  logoAlt: 'eSign logo',
} as const;

/** Label for the header entry point that opens the settings section. */
export const SETTINGS_ENTRY_LABEL = 'Settings';

/** H1 shown at the top of the settings shell. */
export const SETTINGS_SECTION_TITLE = 'Settings';

/** Accessible name for the settings navigation landmark. */
export const SETTINGS_NAV_LABEL = 'Settings menu';

/**
 * Settings sub-sections, in menu order. Only sections with a real page live
 * here — no dead links. Future settings (notifications, security, etc.) append
 * to this list and the shell/nav pick them up with no structural change.
 */
export const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  { href: '/settings/branding', label: 'Branding' },
  { href: '/settings/language', label: 'Language' },
];

/** The default settings sub-section landed on when entering `/settings`. */
export const SETTINGS_DEFAULT_ROUTE = '/settings/branding';

/** Intro copy for the Branding sub-section (heading + one-line description). */
export const BRANDING_COPY = {
  title: 'Branding',
  description:
    'Set your logo, favicon, and brand color to bring your brand to the whole service.',
} as const;

/**
 * Copy for the branding form that assembles the two image uploaders (logo and
 * favicon) and the brand color picker with a save/cancel action bar. Field
 * labels are short nouns. Saving now really persists and reflects service-wide,
 * so the status line is honest about that: it confirms the change already took
 * effect for everyone (no more "coming soon" framing). The "already set" hints
 * tell the admin a stored logo/favicon exists and that a new upload replaces
 * it. Tone follows the project base voice: plain, calm, {what happened} +
 * {what's next / result}.
 */
export const BRANDING_FORM_COPY = {
  /** Label for the logo image uploader field. */
  logoLabel: 'Logo',
  /** Label for the favicon image uploader field. */
  faviconLabel: 'Favicon',
  /** Hint shown on the logo uploader when a logo is already stored. */
  logoSetHint: 'A logo is currently set. Upload a new SVG or PNG (up to 1MB) to replace it.',
  /** Hint shown on the favicon uploader when a favicon is already stored. */
  faviconSetHint:
    'A favicon is currently set. Upload a new SVG or PNG (up to 1MB) to replace it.',
  /** Primary action — persists the current inputs and reflects them service-wide. */
  save: 'Save',
  /** Secondary action — reverts the fields to the last saved values. */
  cancel: 'Cancel',
  /**
   * Shown after a successful save. Honest: the settings are saved and already in
   * force across the service (header logo · browser-tab favicon · brand color).
   */
  savedNotice: 'Branding settings saved. They are already live across the service.',
} as const;

/**
 * Copy for the brand color picker (swatch + HEX input + live preview).
 * Single source so the control's label, guidance, and validation message stay
 * in base voice (blame-free, points to the next action). The error line
 * follows `{what's off} + {how to fix, with an example}` like the uploader guard.
 */
export const BRAND_COLOR_COPY = {
  label: 'Brand color',
  hint: 'Used on key elements like buttons and links. Enter a color code like #163AF2 or pick one from the color panel.',
  /** Shown when the typed HEX code isn't a valid `#rgb` / `#rrggbb` value. */
  invalidHex: 'Please check the color code. Enter 3 or 6 digits, like #163AF2.',
  /** Accessible name for the swatch that opens the native color picker. */
  swatchLabel: 'Pick a brand color from the color panel',
  /** Caption above the preview strip. */
  previewLabel: 'Preview',
  /** Sample elements inside the preview, so the swatch shows real re-skinning. */
  previewButton: 'Send signature request',
  previewLink: 'Preview contract',
} as const;

/**
 * Copy for the branding live-preview panel (BrandingPreview) — the read-only
 * mockups that show how the picked logo, favicon, and brand color will look
 * across the service before saving. Kept here with the rest of the branding form
 * copy so the panel's structure/tone stay consistent and auditable. Tone follows
 * the project base voice: plain, calm, action-forward. The panel reuses the
 * service name (`HEADER_BRAND_COPY.wordmark`) and the settings entry label rather
 * than duplicating them, so a rename stays single-source. The image alts are for
 * the decorative preview thumbnails; the mockups themselves are hidden from
 * assistive tech (the form fields already convey each chosen value).
 */
export const BRANDING_PREVIEW_COPY = {
  /** Panel heading — names the live preview region. */
  title: 'Preview',
  /** One-line intro clarifying the preview reflects choices before saving. */
  description:
    'See how your chosen logo, favicon, and color will look in the service before saving.',
  /** Caption above the app-header mockup. */
  headerLabel: 'Header',
  /** Caption above the browser-tab mockup. */
  tabLabel: 'Browser tab',
  /** Caption above the accent-color sample. */
  colorLabel: 'Accent color',
  /** Decorative alt for the header logo preview image. */
  logoAlt: 'Logo preview',
  /** Decorative alt for the favicon preview image. */
  faviconAlt: 'Favicon preview',
  /** Sample primary button inside the accent-color mockup. */
  sampleButton: 'Send signature request',
  /** Sample link inside the accent-color mockup. */
  sampleLink: 'Preview contract',
} as const;
