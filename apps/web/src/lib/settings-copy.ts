/**
 * Settings section structure — the routes the settings shell navigates between
 * and the catalog key that names each one.
 *
 * The Korean strings this module used to own now live in the `settings` domain
 * of the browser catalog (`lib/i18n/settings.ts`); what stays here is the part
 * that is *not* copy: which sub-sections exist, in what order, and where
 * `/settings` lands. Keeping the key beside the route is what lets a new
 * sub-section be added in one place without the shell learning about it.
 */

import type { WebTranslate, WebTranslationKey } from './web-translations';

/** An authored sub-section: its route and the catalog key naming it. */
interface SettingsNavRoute {
  href: string;
  labelKey: WebTranslationKey;
}

/** A nav entry resolved into the reader's language, ready for `SettingsNav`. */
export interface SettingsNavItem {
  /** Route this item links to, e.g. `/settings/branding`. */
  href: string;
  /** Menu label in the reader's language. */
  label: string;
}

/**
 * Settings sub-sections, in menu order. Only sections with a real page live
 * here — no dead links. A future section appends one entry and the shell/nav
 * pick it up with no structural change.
 */
const SETTINGS_NAV_ROUTES: readonly SettingsNavRoute[] = [
  { href: '/settings/branding', labelKey: 'settings.branding' },
  { href: '/settings/language', labelKey: 'settings.language' },
];

/** The default settings sub-section landed on when entering `/settings`. */
export const SETTINGS_DEFAULT_ROUTE = '/settings/branding';

/** Resolve the menu for one reader. The shell hands the result to `SettingsNav`. */
export function settingsNavItems(t: WebTranslate): SettingsNavItem[] {
  return SETTINGS_NAV_ROUTES.map((route) => ({ href: route.href, label: t(route.labelKey) }));
}
