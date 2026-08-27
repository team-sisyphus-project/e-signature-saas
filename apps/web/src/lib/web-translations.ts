import type { SupportedLocale } from './locale';
import { WEB_TRANSLATIONS } from './i18n';
import type {
  TranslationLeaf,
  WebTranslationCatalog,
  WebTranslationCatalogs,
  WebTranslationParams,
} from './i18n/types';

// Re-exported so callers keep one import site for the lookup API and the
// catalog it reads. The authoring surface (domain modules, entry types) is
// deliberately not re-exported: copy is added in `lib/i18n/`, not here.
export { WEB_TRANSLATIONS } from './i18n';
export type {
  TranslationLeaf,
  WebTranslationCatalog,
  WebTranslationCatalogs,
  WebTranslationParams,
} from './i18n/types';

/** A key is open-ended so newly added UI copy is safe before its catalog ships. */
export type WebTranslationKey = `${string}.${string}`;

export type MissingWebTranslationReason = 'missing' | 'empty' | 'placeholder';

/** This report retains keys and counters only, never user data or rendered copy. */
export interface MissingWebTranslationEntry {
  key: WebTranslationKey;
  /** Locale requested by the UI at the point the lookup failed. */
  requestedLocale: SupportedLocale;
  /** Catalog whose copy was actually rendered. */
  fallbackLocale: SupportedLocale;
  reason: MissingWebTranslationReason;
  count: number;
}

export interface WebTranslationFallbackReport {
  /**
   * De-duplicated keys with no usable copy in the requested locale, suitable for
   * a coverage report. Unresolved placeholders are excluded: their copy exists
   * and needs no translator, so counting them here would overstate the gap.
   */
  missingKeys: readonly WebTranslationKey[];
  /** Per-locale detail and occurrence counts for runtime diagnostics. */
  entries: readonly MissingWebTranslationEntry[];
}

/** Last-resort Korean text when even the Korean base catalog is incomplete. */
export const UNKNOWN_WEB_TRANSLATION_FALLBACK = '내용을 준비하고 있습니다.';

/**
 * Substitution slot inside a catalog value, e.g. `{count}`.
 *
 * Deliberately narrow: only word characters form a placeholder, so prose that
 * legitimately contains braces is left untouched rather than silently mangled.
 */
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function lookup(catalog: WebTranslationCatalog | undefined, key: WebTranslationKey): TranslationLeaf {
  const separator = key.indexOf('.');
  if (separator < 1 || separator === key.length - 1) return undefined;
  return catalog?.[key.slice(0, separator)]?.[key.slice(separator + 1)];
}

function missingReason(value: TranslationLeaf): MissingWebTranslationReason | undefined {
  if (value == null) return 'missing';
  if (value.trim() === '') return 'empty';
  return undefined;
}

function isUsableTranslation(value: TranslationLeaf): value is string {
  return !missingReason(value);
}

/**
 * Replace `{name}` slots with `params.name`.
 *
 * An unsupplied slot keeps its literal `{name}` text and calls `onUnresolved`.
 * Keeping the token is the only option that neither invents copy nor leaves a
 * hole in the sentence, and the callback is what stops the defect from staying
 * invisible: it lands in the same report a missing translation does.
 *
 * Only own properties are read, so a slot named `constructor` or `toString`
 * cannot pull an inherited object member into rendered copy.
 */
function interpolate(
  template: string,
  params: WebTranslationParams | undefined,
  onUnresolved: () => void,
): string {
  if (!template.includes('{')) return template;

  return template.replace(PLACEHOLDER_PATTERN, (token, name: string) => {
    if (!params || !Object.prototype.hasOwnProperty.call(params, name)) {
      onUnresolved();
      return token;
    }

    const value = params[name];
    if (value == null) {
      onUnresolved();
      return token;
    }

    return String(value);
  });
}

/**
 * Creates an isolated lookup runtime. Isolated instances keep tests, previews,
 * and coverage jobs independent of the shared browser report.
 */
export function createWebTranslationRuntime(catalogs: WebTranslationCatalogs = WEB_TRANSLATIONS): {
  translate: (
    locale: SupportedLocale,
    key: WebTranslationKey,
    params?: WebTranslationParams,
  ) => string;
  getFallbackReport: () => WebTranslationFallbackReport;
  resetFallbackReport: () => void;
} {
  const missing = new Map<string, MissingWebTranslationEntry>();

  const record = (
    requestedLocale: SupportedLocale,
    fallbackLocale: SupportedLocale,
    key: WebTranslationKey,
    reason: MissingWebTranslationReason,
  ) => {
    // A NUL separator cannot occur inside a key, so two distinct tuples can
    // never collapse into one entry.
    const id = [requestedLocale, fallbackLocale, key, reason].join('\u0000');
    const previous = missing.get(id);
    if (previous) {
      previous.count += 1;
      return;
    }
    missing.set(id, { key, requestedLocale, fallbackLocale, reason, count: 1 });
  };

  /** Interpolate the chosen copy, attributing placeholder gaps to its source catalog. */
  const render = (
    requestedLocale: SupportedLocale,
    sourceLocale: SupportedLocale,
    key: WebTranslationKey,
    template: string,
    params: WebTranslationParams | undefined,
  ) => interpolate(template, params, () => record(requestedLocale, sourceLocale, key, 'placeholder'));

  return {
    translate(locale, key, params) {
      const localized = lookup(catalogs[locale], key);
      if (isUsableTranslation(localized)) return render(locale, locale, key, localized, params);

      record(locale, 'ko', key, missingReason(localized)!);
      const korean = lookup(catalogs.ko, key);
      return isUsableTranslation(korean)
        ? render(locale, 'ko', key, korean, params)
        : UNKNOWN_WEB_TRANSLATION_FALLBACK;
    },
    getFallbackReport() {
      const entries = [...missing.values()].map((entry) => ({ ...entry }));
      return {
        missingKeys: [
          ...new Set(
            entries.filter((entry) => entry.reason !== 'placeholder').map((entry) => entry.key),
          ),
        ],
        entries,
      };
    },
    resetFallbackReport() {
      missing.clear();
    },
  };
}

/** Shared browser runtime used by hooks and direct UI translation calls. */
export const webTranslationRuntime = createWebTranslationRuntime();

/** Returns localized copy, Korean base copy, or a safe Korean placeholder, never a key or blank string. */
export function translateWeb(
  locale: SupportedLocale,
  key: WebTranslationKey,
  params?: WebTranslationParams,
): string {
  return webTranslationRuntime.translate(locale, key, params);
}

/** Snapshot the missing/empty localized keys replaced by Korean at runtime. */
export function getWebTranslationFallbackReport(): WebTranslationFallbackReport {
  return webTranslationRuntime.getFallbackReport();
}

/** Convenience API for coverage reporters that only need the unique key list. */
export function getMissingWebTranslationKeys(): readonly WebTranslationKey[] {
  return getWebTranslationFallbackReport().missingKeys;
}

/** Clear the shared runtime report, for example after a diagnostics upload. */
export function resetWebTranslationFallbackReport(): void {
  webTranslationRuntime.resetFallbackReport();
}
