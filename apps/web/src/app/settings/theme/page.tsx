'use client';

/**
 * Theme settings — the member-facing control that chooses the app color theme
 * (밝게 / 어둡게 / 시스템 설정 따름). Sister control to the language radiogroup
 * (`settings/language/page.tsx`): same structure (Label + segmented Track +
 * Option×N + save feedback), different option set.
 *
 * Interaction: selection applies AND persists in one action. `ThemeProvider`'s
 * `setPreference` flips `<html data-theme>` optimistically (instant, no reload)
 * and persists via `POST /auth/theme`, so the choice survives re-login. On save
 * failure the provider rolls back and rethrows, so we surface a retry.
 *
 * Colors use semantic tokens only (no hard-coded hex); the control lives inside
 * the global `color/dark` subtree, so it re-colors with the very theme it sets.
 */

import * as React from 'react';
import { Button, Card } from '@repo/ui';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/components/locale-provider';
import type { ThemePreference } from '@/lib/theme';

/** Option order shown in the segmented track: light, dark, then follow-system. */
const OPTIONS: readonly ThemePreference[] = ['light', 'dark', 'system'];

export default function ThemeSettingsPage() {
  const t = useTranslation();
  const { preference, setPreference } = useTheme();
  const [pending, setPending] = React.useState<ThemePreference | null>(null);
  const [saveError, setSaveError] = React.useState<ThemePreference | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  const saving = pending !== null;

  React.useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => setSavedNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  async function choose(next: ThemePreference) {
    // Already the applied preference and nothing to retry → no-op.
    if (next === preference && !saveError) return;
    setPending(next);
    setSaveError(null);
    setSavedNotice(null);
    try {
      await setPreference(next); // optimistic apply + persist; rolls back on failure
      setSavedNotice(t('settings.themeSaved'));
    } catch {
      setSaveError(next);
    } finally {
      setPending(null);
    }
  }

  function optionLabel(value: ThemePreference): string {
    if (value === 'light') return t('settings.themeLight');
    if (value === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  }

  return (
    <section aria-labelledby="theme-settings-heading" className="flex flex-col gap-lg">
      <header>
        <h2 id="theme-settings-heading" className="text-xl font-bold text-foreground">
          {t('settings.themeTitle')}
        </h2>
        <p className="mt-2xs text-base text-foreground-subtle">{t('settings.themeDescription')}</p>
      </header>

      <Card className="p-lg">
        <p id="theme-preference-label" className="text-sm font-semibold text-foreground">
          {t('settings.theme')}
        </p>
        <div
          className="mt-md inline-flex rounded-md bg-surface-muted p-1"
          role="radiogroup"
          aria-labelledby="theme-preference-label"
        >
          {OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={preference === value}
              disabled={saving}
              onClick={() => void choose(value)}
              className={`rounded-sm px-md py-sm text-sm font-medium ${
                preference === value ? 'bg-surface text-primary shadow-sm' : 'text-foreground-subtle'
              }`}
            >
              {optionLabel(value)}
            </button>
          ))}
        </div>
        {preference === 'system' ? (
          <p className="mt-sm text-sm text-foreground-subtle">{t('settings.themeSystemHint')}</p>
        ) : null}
      </Card>

      {saveError ? (
        <div
          className="flex items-center justify-between gap-sm rounded-md bg-danger-subtle px-md py-sm text-sm text-danger"
          role="alert"
        >
          <span>{t('settings.themeSaveFailed')}</span>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => void choose(saveError)}>
            {t('settings.retry')}
          </Button>
        </div>
      ) : null}

      {savedNotice ? (
        <p className="rounded-md bg-success-subtle px-md py-sm text-sm text-success" role="status">
          {savedNotice}
        </p>
      ) : null}
    </section>
  );
}
