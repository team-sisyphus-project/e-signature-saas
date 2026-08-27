/**
 * Theme primitives — the pure, framework-free core of the per-member
 * Light / Dark / Follow-system preference.
 *
 * Everything here is deliberately small and side-effect-light so both the
 * pre-paint inline `<head>` script and the live `ThemeProvider` resolve the
 * theme the *same* way (no hydration flip). The design of record lives in the
 * theme-preference model spec; this module is its executable form:
 *
 *   • `ThemePreference` is the member's choice (`light` | `dark` | `system`).
 *   • `resolveTheme` maps a preference (+ the OS `prefers-color-scheme`) onto a
 *     concrete applied theme (`light` | `dark`).
 *   • The DOM only ever carries a concrete theme: dark → `data-theme="dark"` on
 *     `<html>`, light → the attribute is absent (light is the Base palette).
 *
 * The `esign_theme` cookie is a non-secret, non-HttpOnly *mirror* of the stored
 * preference so the pre-paint script can read it before any JS module loads.
 */

export const SUPPORTED_THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof SUPPORTED_THEME_PREFERENCES)[number];

/** The concrete theme actually applied to the DOM. `system` never reaches here. */
export type ResolvedTheme = 'light' | 'dark';

/** Non-HttpOnly UI hint read by the pre-paint script (see the no-flash script). */
export const THEME_COOKIE_NAME = 'esign_theme';
/**
 * One year. Unlike the 7-day auth cookie, the theme cookie mirrors no
 * server-enforced lifetime — it is a UI hint, refreshed on every login/save and
 * cleared on logout, so a long life just keeps the pre-paint script correct on a
 * returning device.
 */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Normalise any value to a known preference. Unknown / absent → `system`, so a
 * tampered cookie or a stale value can only ever yield one of the three enum
 * members (fail safe).
 */
export function parseThemePreference(value?: string | null): ThemePreference {
  return (SUPPORTED_THEME_PREFERENCES as readonly string[]).includes(value ?? '')
    ? (value as ThemePreference)
    : 'system';
}

/**
 * Resolve a member preference to the concrete theme to apply. `system` follows
 * the OS (`prefersDark`); any unknown value falls through as `system` too.
 */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

/** True when the OS asks for dark. Unresolvable `matchMedia` → false (light Base). */
export function prefersDarkScheme(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Apply a concrete theme to `<html>`: set `data-theme="dark"` for dark, remove
 * the attribute for light (light is the Base — absence *is* light). Setting or
 * removing this one attribute is the entire apply step.
 */
export function applyResolvedTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

/** Read the `esign_theme` cookie mirror; unknown/absent → `system`. */
export function readThemeCookie(): ThemePreference {
  if (typeof document === 'undefined') return 'system';
  const raw = document.cookie.match(/(?:^|;\s*)esign_theme=([^;]*)/)?.[1];
  return parseThemePreference(raw !== undefined ? decodeURIComponent(raw) : null);
}

/** Write the mirror cookie (non-HttpOnly, Path=/, SameSite=Lax, Secure on https, 1y). */
export function writeThemeCookie(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(preference)}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Clear the mirror cookie (on logout, alongside the auth cookie). */
export function clearThemeCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * The pre-paint, no-flash script. A **static constant** — it interpolates no
 * server value, cookie content, or user input, so the `dangerouslySetInnerHTML`
 * payload has no XSS surface (it reads the cookie itself, at runtime, in the
 * browser). It mirrors `resolveTheme` exactly so the first frame already carries
 * the correct theme before React hydrates. Wrapped in try/catch so a hostile /
 * malformed cookie can never block first paint.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)esign_theme=([^;]*)/);var p=m?decodeURIComponent(m[1]):'system';if(p!=='light'&&p!=='dark'&&p!=='system')p='system';var d=p==='dark'||(p==='system'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');else document.documentElement.removeAttribute('data-theme');}catch(e){}})();`;
