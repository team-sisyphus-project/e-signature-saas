'use client';

import * as React from 'react';
import { getUser, restoreSession } from '@/lib/auth';
import {
  fetchTranslationResources,
  getBrowserLanguages,
  getLinkLocale,
  resolveLocale,
  resolvePublicEntryLocale,
  type SupportedLocale,
  type TranslationResources,
} from '@/lib/locale';
import {
  translateWeb,
  type WebTranslationKey,
  type WebTranslationParams,
} from '@/lib/web-translations';

interface LocaleContextValue {
  /** Target locale resolved with the product-wide precedence contract. */
  locale: SupportedLocale;
  /** Loaded API catalog for the target locale; undefined while its first request is pending. */
  resources: TranslationResources['resources'] | undefined;
  /**
   * Public-link flows call this with the sender's *stored* preference
   * (`meta.sender.locale`) once metadata arrives — never with a locale the
   * server already resolved, which would mask the absence of that preference.
   */
  setSenderLocale: (locale: string | null | undefined) => void;
  /** Public-link UI must never inherit a signed-in user's saved preference. */
  setPublicLinkActive: (active: boolean) => void;
  /**
   * Localized copy for `key`, with `{name}` slots filled from `params`.
   *
   * Interpolation lives here rather than at call sites so a sentence stays one
   * catalog entry: splitting it into fragments to concatenate a value would
   * fix Korean word order onto every other language.
   */
  t: (key: WebTranslationKey, params?: WebTranslationParams) => string;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

/**
 * Global locale runtime. It deliberately changes no visible copy in this
 * foundation grain; consumers in later grains use the resolved catalog.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [userLocale, setUserLocale] = React.useState<string | null>(null);
  const [linkLocale, setLinkLocale] = React.useState<string | null>(null);
  const [senderLocale, setSenderLocale] = React.useState<string | null>(null);
  const [publicLinkActive, setPublicLinkActive] = React.useState(false);
  const [browserLanguages, setBrowserLanguages] = React.useState<readonly string[]>([]);
  const [resources, setResources] = React.useState<TranslationResources['resources']>();

  const refreshUserLocale = React.useCallback(() => setUserLocale(getUser()?.locale ?? null), []);
  const refreshLinkLocale = React.useCallback(() => setLinkLocale(getLinkLocale() ?? null), []);
  const setPublicSenderLocale = React.useCallback(
    (locale: string | null | undefined) => setSenderLocale(locale ?? null),
    [],
  );

  // The URL is read after mount rather than through `useSearchParams`, which
  // would opt the whole app shell out of static rendering. `popstate` keeps the
  // tier from going stale when the visitor navigates back out of a `?lang=` link.
  React.useEffect(() => {
    setBrowserLanguages(getBrowserLanguages());
    refreshLinkLocale();
    refreshUserLocale();
    window.addEventListener('esign:session-change', refreshUserLocale);
    window.addEventListener('popstate', refreshLinkLocale);
    // A token without a cached user means the browser lost the session copy, not
    // that the account has no preference. Re-read it from the account; the
    // resulting `esign:session-change` feeds the user tier through the listener
    // registered just above, so the answer cannot arrive unheard.
    void restoreSession();
    return () => {
      window.removeEventListener('esign:session-change', refreshUserLocale);
      window.removeEventListener('popstate', refreshLinkLocale);
    };
  }, [refreshUserLocale, refreshLinkLocale]);

  // Two resolvers, not one call with a nulled-out field: on a public link the
  // signed-in tier does not exist rather than merely being empty.
  // `resolvePublicEntryLocale` owns that rule so it can be tested without
  // mounting this provider.
  const locale = publicLinkActive
    ? resolvePublicEntryLocale({ linkLocale, senderLocale, browserLanguages })
    : resolveLocale({ userLocale, linkLocale, senderLocale, browserLanguages });

  React.useEffect(() => {
    let active = true;
    fetchTranslationResources(locale)
      .then((result) => {
        if (active) setResources(result.resources);
      })
      .catch(() => {
        // Resource failure must not leave a stale catalog labelled as the new locale.
        if (active) setResources(undefined);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      resources,
      setSenderLocale: setPublicSenderLocale,
      setPublicLinkActive,
      t: (key, params) => translateWeb(locale, key, params),
    }),
    [locale, resources, setPublicSenderLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = React.useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
}

export function useTranslation() {
  return useLocale().t;
}
