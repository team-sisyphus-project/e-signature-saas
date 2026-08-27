'use client';

/**
 * ThemeProvider — the app-wide runtime that keeps the applied color theme live.
 *
 * The pre-paint inline `<head>` script (see `THEME_NO_FLASH_SCRIPT`) has already
 * set the correct `data-theme` before first paint; this provider hydrates with
 * the *same* resolution logic (so no flip) and then owns live updates:
 *
 *   • Seeded from the stored session preference (`getUser()?.themePreference`),
 *     falling back to the `esign_theme` cookie, then `system` — matching what the
 *     pre-paint script applied.
 *   • Subscribes to `matchMedia('(prefers-color-scheme: dark)')` so a live OS
 *     switch reflects immediately — but only while the preference is `system`.
 *   • Subscribes to `esign:session-change` (the same event `LocaleProvider` uses)
 *     so login/logout re-reads the stored preference.
 *   • `setPreference` applies optimistically (instant, no reload), then persists
 *     via `updateTheme`, rolling back and rethrowing on failure so the settings
 *     control can surface a retry.
 */

import * as React from 'react';
import { getUser, updateTheme } from '@/lib/auth';
import {
  applyResolvedTheme,
  parseThemePreference,
  readThemeCookie,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  /** The member's chosen preference (`light` | `dark` | `system`). */
  preference: ThemePreference;
  /** The concrete theme currently applied to `<html>` (`light` | `dark`). */
  resolvedTheme: ResolvedTheme;
  /** Apply + persist a new preference. Optimistic; rejects (and rolls back) on save failure. */
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/** Read the in-effect preference: stored session user first, else cookie mirror. */
function currentPreference(): ThemePreference {
  const stored = getUser()?.themePreference;
  if (stored) return parseThemePreference(stored);
  return readThemeCookie();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Deterministic SSR seed (`system`); the effect below reconciles to the real
  // stored preference on mount — the DOM attribute is owned by the pre-paint
  // script until then, so there is no visible flip.
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>('light');

  const syncFromSession = React.useCallback(() => setPreferenceState(currentPreference()), []);

  // Seed from the session and re-read whenever the session changes (login/logout).
  React.useEffect(() => {
    syncFromSession();
    window.addEventListener('esign:session-change', syncFromSession);
    return () => window.removeEventListener('esign:session-change', syncFromSession);
  }, [syncFromSession]);

  // Apply the resolved theme, and — only under `system` — track live OS changes.
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = resolveTheme(preference, query.matches);
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };
    apply();
    if (preference !== 'system') return;
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = React.useCallback(
    async (next: ThemePreference) => {
      const previous = currentPreference();
      setPreferenceState(next); // optimistic: attribute flips in the same tick
      try {
        await updateTheme(next);
      } catch (error) {
        setPreferenceState(previous); // roll back to the last saved value
        throw error;
      }
    },
    [],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Read the current theme preference and the setter. Throws outside a provider. */
export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
