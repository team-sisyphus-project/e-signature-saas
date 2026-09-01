'use client';

import * as React from 'react';
import { getUser } from '@/lib/auth';
import {
  fetchTranslationResources,
  getBrowserLanguages,
  getLinkLocale,
  resolvePublicEntryLocale,
  resolveLocale,
  type SupportedLocale,
  type TranslationResources,
} from '@/lib/locale';
import { translateWeb, type WebTranslationKey } from '@/lib/web-translations';

interface LocaleContextValue {
  /** Target locale resolved with the product-wide precedence contract. */
  locale: SupportedLocale;
  /** Loaded API catalog for the target locale; undefined while its first request is pending. */
  resources: TranslationResources['resources'] | undefined;
  /** Public-link flows call this after their metadata has revealed the sender locale. */
  setSenderLocale: (locale: string | null | undefined) => void;
  /** Public-link metadata can provide the server's authoritative resolution. */
  setPublicResolvedLocale: (locale: SupportedLocale | null | undefined) => void;
  /** Public-link UI must never inherit a signed-in user's saved preference. */
  setPublicLinkActive: (active: boolean) => void;
  t: (key: WebTranslationKey) => string;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

/**
 * Global locale runtime. It deliberately changes no visible copy in this
 * foundation grain; consumers in later grains use the resolved catalog.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [userLocale, setUserLocale] = React.useState<string | null>(null);
  const [senderLocale, setSenderLocale] = React.useState<string | null>(null);
  const [publicResolvedLocale, setPublicResolvedLocale] = React.useState<SupportedLocale | null>(
    null,
  );
  const [linkLocale, setLinkLocale] = React.useState<string | null>(null);
  const [publicLinkActive, setPublicLinkActive] = React.useState(false);
  const [browserLanguages, setBrowserLanguages] = React.useState<readonly string[]>([]);
  const [resources, setResources] = React.useState<TranslationResources['resources']>();

  const refreshUserLocale = React.useCallback(() => setUserLocale(getUser()?.locale ?? null), []);
  const setResolvedPublicLocale = React.useCallback(
    (locale: SupportedLocale | null | undefined) => setPublicResolvedLocale(locale ?? null),
    [],
  );
  const setPublicSenderLocale = React.useCallback(
    (locale: string | null | undefined) => setSenderLocale(locale ?? null),
    [],
  );

  React.useEffect(() => {
    setBrowserLanguages(getBrowserLanguages());
    setLinkLocale(getLinkLocale());
    refreshUserLocale();
    window.addEventListener('esign:session-change', refreshUserLocale);
    return () => window.removeEventListener('esign:session-change', refreshUserLocale);
  }, [refreshUserLocale]);

  const locale = publicLinkActive
    ? (publicResolvedLocale ??
      resolvePublicEntryLocale({ linkLocale, senderLocale, browserLanguages }))
    : resolveLocale({ userLocale, senderLocale, browserLanguages });

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
      setPublicResolvedLocale: setResolvedPublicLocale,
      setPublicLinkActive,
      t: (key) => translateWeb(locale, key),
    }),
    [locale, resources, setPublicSenderLocale, setResolvedPublicLocale],
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
