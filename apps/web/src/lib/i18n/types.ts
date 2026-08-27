/**
 * Shared shapes for the domain-scoped browser catalog.
 *
 * These live apart from `lib/web-translations.ts` so a domain module can type
 * itself without importing the runtime that composes every domain, which would
 * be a cycle. `web-translations.ts` re-exports them, so callers keep one import
 * site.
 *
 * Two shapes appear here on purpose:
 *
 * - The **authoring** shape (`WebTranslationDomain`) pairs every key with one
 *   string per supported locale, so omitting a translation is a type error at
 *   the moment the copy is written.
 * - The **runtime** shape (`WebTranslationCatalogs`) is per-locale and tolerates
 *   holes, because the runtime's job is to detect and report them — including in
 *   catalogs it did not author, such as test fixtures.
 */

import type { SupportedLocale } from '../locale';

/**
 * One authored entry: the same copy in every supported locale.
 *
 * `Record<SupportedLocale, string>` is the enforcement point of the whole
 * catalog — a key cannot exist in Korean only.
 */
export type WebTranslationEntry = Readonly<Record<SupportedLocale, string>>;

/**
 * A domain module's export: `key → entry`, where the key is the part after the
 * `domain.` prefix used at call sites.
 */
export type WebTranslationDomain = Readonly<Record<string, WebTranslationEntry>>;

/**
 * A single value as the runtime sees it. `null`/`undefined` are representable
 * because an untranslated entry is a real state the runtime must survive and
 * report, not something it may assume away.
 */
export type TranslationLeaf = string | null | undefined;

/** Flat `key → copy` map owned by one domain, for one locale. */
export type WebTranslationDomainCatalog = Readonly<Record<string, TranslationLeaf>>;

/** Every domain of one locale, keyed by domain name (the key prefix). */
export type WebTranslationCatalog = Readonly<Record<string, WebTranslationDomainCatalog>>;

/** The composed catalog: one entry per supported locale. */
export type WebTranslationCatalogs = Readonly<Record<SupportedLocale, WebTranslationCatalog>>;

/**
 * Values substituted into `{placeholder}` slots. Numbers are accepted so call
 * sites need not stringify counts; the substitution stays plain by design —
 * locale-aware number/currency formatting is outside this catalog's scope.
 */
export type WebTranslationParams = Readonly<Record<string, string | number>>;
