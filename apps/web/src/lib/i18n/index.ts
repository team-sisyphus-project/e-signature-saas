/**
 * Composition point for the browser copy catalog.
 *
 * Each domain module owns one screen family and authors its keys with every
 * supported locale side by side. This module transposes those authored domains
 * into the per-locale catalogs the lookup runtime consumes, so the domain list
 * is declared exactly once and `ko`/`en` cannot drift apart structurally.
 */

import { SUPPORTED_LOCALES, type SupportedLocale } from '../locale';
import { AUTH_TRANSLATIONS } from './auth';
import { COMMON_TRANSLATIONS } from './common';
import { CONTRACTS_TRANSLATIONS } from './contracts';
import { DASHBOARD_TRANSLATIONS } from './dashboard';
import { SETTINGS_TRANSLATIONS } from './settings';
import { SHARE_TRANSLATIONS } from './share';
import { SIGNER_TRANSLATIONS } from './signer';
import { TEMPLATES_TRANSLATIONS } from './templates';
import { WIZARD_TRANSLATIONS } from './wizard';
import type { WebTranslationCatalogs, WebTranslationDomain } from './types';

/**
 * The complete domain set. A domain name is the prefix of every key it owns:
 * `settings.languageTitle` resolves to `settings` here.
 *
 * A domain may be empty while its screens are still being migrated — declaring
 * it up front is what stops each migration from inventing a rival prefix.
 */
export const WEB_TRANSLATION_DOMAINS = {
  common: COMMON_TRANSLATIONS,
  auth: AUTH_TRANSLATIONS,
  dashboard: DASHBOARD_TRANSLATIONS,
  wizard: WIZARD_TRANSLATIONS,
  settings: SETTINGS_TRANSLATIONS,
  templates: TEMPLATES_TRANSLATIONS,
  contracts: CONTRACTS_TRANSLATIONS,
  signer: SIGNER_TRANSLATIONS,
  share: SHARE_TRANSLATIONS,
} as const satisfies Readonly<Record<string, WebTranslationDomain>>;

export type WebTranslationDomainName = keyof typeof WEB_TRANSLATION_DOMAINS;

/** Declared domain names, for coverage reports and structural tests. */
export const WEB_TRANSLATION_DOMAIN_NAMES = Object.keys(
  WEB_TRANSLATION_DOMAINS,
) as readonly WebTranslationDomainName[];

/**
 * Transpose authored domains (`key → { ko, en }`) into runtime catalogs
 * (`locale → domain → key`).
 *
 * Exported so structural tests and preview tooling can compose their own domain
 * sets through the same path the shipped catalog takes.
 */
export function composeWebTranslations(
  domains: Readonly<Record<string, WebTranslationDomain>>,
): WebTranslationCatalogs {
  const catalogs: Record<string, Record<string, Record<string, string>>> = {};

  for (const locale of SUPPORTED_LOCALES) {
    const catalog: Record<string, Record<string, string>> = {};
    for (const [domainName, domain] of Object.entries(domains)) {
      const entries: Record<string, string> = {};
      for (const [key, entry] of Object.entries(domain)) entries[key] = entry[locale];
      catalog[domainName] = entries;
    }
    catalogs[locale] = catalog;
  }

  return catalogs as Record<SupportedLocale, Record<string, Record<string, string>>>;
}

/** Browser UI catalog. Missing English copy always falls back to Korean. */
export const WEB_TRANSLATIONS = composeWebTranslations(WEB_TRANSLATION_DOMAINS);

export type {
  TranslationLeaf,
  WebTranslationCatalog,
  WebTranslationCatalogs,
  WebTranslationDomain,
  WebTranslationDomainCatalog,
  WebTranslationEntry,
  WebTranslationParams,
} from './types';
