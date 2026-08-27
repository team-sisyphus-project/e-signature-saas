/**
 * Locale primitives shared by the authenticated app and public-link flows.
 *
 * The API remains the source of the resource catalog; this module only decides
 * which of its two published catalogs the browser should request. Keeping the
 * decision pure makes the client follow the same precedence as the API.
 */

import { apiFetch } from './api';

export const SUPPORTED_LOCALES = ['ko', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Locale chosen when no tier of `resolveLocale` yields a supported language. */
export const DEFAULT_LOCALE: SupportedLocale = 'ko';

export interface LocaleResolutionInput {
  /** Persisted preference of the currently authenticated user. */
  userLocale?: string | null;
  /** Explicit locale carried by the link that opened this screen. */
  linkLocale?: string | null;
  /** Persisted preference of the sender of a public link. */
  senderLocale?: string | null;
  /** Browser language tags, in browser preference order. */
  browserLanguages?: readonly string[] | null;
}

export interface TranslationResources {
  locale: SupportedLocale;
  resources: Record<string, unknown>;
}

/** Normalise `en-US` / `ko_KR` tags into one of the published locales. */
export function parseLocale(value?: string | null): SupportedLocale | undefined {
  if (!value) return undefined;
  const language = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return SUPPORTED_LOCALES.find((locale) => locale === language);
}

/** First supported browser preference, ignoring unsupported language tags. */
export function localeFromBrowserLanguages(
  languages?: readonly string[] | null,
): SupportedLocale | undefined {
  return languages?.map(parseLocale).find((locale): locale is SupportedLocale => !!locale);
}

/**
 * Resolve: signed-in user → link parameter → public-link sender → browser → Korean.
 *
 * The link parameter outranks the sender because it is an explicit, per-entry
 * instruction ("open this in English"), whereas the sender locale is only a
 * standing default inferred from whoever created the link.
 *
 * Every tier is advisory: a tier holding an unsupported or malformed tag
 * contributes nothing and the next tier decides. A tier never short-circuits
 * the chain to the Korean default.
 */
export function resolveLocale(input: LocaleResolutionInput = {}): SupportedLocale {
  return (
    parseLocale(input.userLocale) ??
    parseLocale(input.linkLocale) ??
    parseLocale(input.senderLocale) ??
    localeFromBrowserLanguages(input.browserLanguages) ??
    DEFAULT_LOCALE
  );
}

/** Query parameter carrying an explicit locale on a signing/share link. */
export const LINK_LOCALE_PARAM = 'lang';

/**
 * Raw `?lang=` value of a query string, or undefined when it is absent or blank.
 *
 * The value is returned unvalidated on purpose: `resolveLocale` owns which tags
 * are supported, so `?lang=fr` must reach it as a spent tier and fall through to
 * the sender/browser tiers, rather than being reclassified into the Korean
 * default here.
 */
export function linkLocaleFromSearch(search?: string | null): string | undefined {
  if (!search) return undefined;
  // URLSearchParams strips a leading `?` itself, so both forms are accepted.
  const value = new URLSearchParams(search).get(LINK_LOCALE_PARAM);
  return value && value.trim() ? value : undefined;
}

/** Read the link locale from the current URL, without assuming a browser (SSR-safe). */
export function getLinkLocale(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return linkLocaleFromSearch(window.location.search);
}

/**
 * `?lang=…` suffix for a public-link API path; empty when there is nothing to
 * forward. Keeps the server resolving from the same parameter the browser saw.
 */
export function linkLocaleQuery(linkLocale?: string | null): string {
  if (!linkLocale) return '';
  return `?${LINK_LOCALE_PARAM}=${encodeURIComponent(linkLocale)}`;
}

/** Browser-facing lookup for the API's read-only translation resources. */
export function fetchTranslationResources(locale: SupportedLocale): Promise<TranslationResources> {
  return apiFetch<TranslationResources>(`/i18n/resources/${locale}`);
}

/** Read browser preferences without making SSR or storage availability assumptions. */
export function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}
