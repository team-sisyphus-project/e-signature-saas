'use client';

import * as React from 'react';
import { Button, Card } from '@repo/ui';
import { getUser, updateLocale } from '@/lib/auth';
import { useLocale, useTranslation } from '@/components/locale-provider';
import {
  SAVE_NOTICE_DURATION_MS,
  beginSave,
  completeSave,
  dismissSaveNotice,
  failSave,
  hasPendingChange,
  initialLanguagePreference,
  isSaving,
  selectLocale,
  syncSavedLocale,
} from '@/lib/language-preference';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/locale';
import { translateWeb, type WebTranslationKey } from '@/lib/web-translations';

/**
 * Option label per locale. A record rather than a ternary so that publishing a
 * third locale is a compile error here — the alternative is a new option
 * quietly rendering under the wrong language's name.
 *
 * Each language names itself in its own language, so a reader stranded in a
 * language they cannot read can still find their way back.
 */
const LOCALE_LABEL_KEYS = {
  ko: 'settings.korean',
  en: 'settings.english',
} as const satisfies Record<SupportedLocale, WebTranslationKey>;

/**
 * Language settings — pick the language the whole product speaks, stored on the
 * account rather than the device.
 *
 * All the panel's state rules live in `lib/language-preference.ts`; what stays
 * here is the wiring that a pure module cannot own:
 *
 *   1. **The stored locale is read after mount, never during render.** Reading
 *      the session while rendering makes the output depend on whether storage
 *      happens to be there, which is exactly what a server render (or a discarded
 *      concurrent render) cannot reproduce. The panel therefore seeds from the
 *      locale the app is already rendering in and corrects itself in an effect.
 *   2. **`esign:session-change` re-syncs it.** That event is the app's single
 *      announcement that the session was written — sign-in, sign-out, or a locale
 *      update from anywhere, including this panel's own save. Listening to it is
 *      what keeps the control describing the *current* account for as long as the
 *      settings shell stays mounted, instead of a snapshot taken at first render.
 */
export default function LanguageSettingsPage() {
  const { locale } = useLocale();
  const t = useTranslation();
  const [state, setState] = React.useState(() => initialLanguagePreference(locale));
  const { saved, selected, status } = state;

  // Adopt whatever the session says, now and on every later change. The
  // transition is a no-op when the stored locale has not actually moved, so the
  // panel's own save echoing back here cannot loop or disturb a pending pick.
  React.useEffect(() => {
    const sync = () => setState((prev) => syncSavedLocale(prev, getUser()?.locale));
    sync();
    window.addEventListener('esign:session-change', sync);
    return () => window.removeEventListener('esign:session-change', sync);
  }, []);

  // The confirmation is transient; an error is not, and is left to the reader.
  React.useEffect(() => {
    if (status.kind !== 'saved') return;
    const timeout = window.setTimeout(
      () => setState(dismissSaveNotice),
      SAVE_NOTICE_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function save(target: SupportedLocale) {
    // The request and the state machine agree on one gate, so no POST is ever
    // sent for a change `beginSave` would refuse to record.
    if (!hasPendingChange(state)) return;
    setState(beginSave);
    try {
      const user = await updateLocale(target);
      setState((prev) => completeSave(prev, user.locale));
    } catch {
      setState(failSave);
    }
  }

  const saving = isSaving(state);
  const pending = hasPendingChange(state);

  const preview = {
    status: translateWeb(selected, 'settings.previewStatus'),
    action: translateWeb(selected, 'settings.previewAction'),
    subject: translateWeb(selected, 'settings.previewEmailSubject'),
  };

  return (
    <section aria-labelledby="language-settings-heading" className="flex flex-col gap-lg">
      <header>
        <h2 id="language-settings-heading" className="text-xl font-bold text-foreground">
          {t('settings.languageTitle')}
        </h2>
        <p className="mt-2xs text-base text-foreground-subtle">{t('settings.languageDescription')}</p>
      </header>

      <Card className="p-lg">
        <p id="language-preference-label" className="text-sm font-semibold text-foreground">
          {t('settings.preference')}
        </p>
        <div
          className="mt-md inline-flex rounded-md bg-surface-muted p-2xs"
          role="radiogroup"
          aria-labelledby="language-preference-label"
        >
          {SUPPORTED_LOCALES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected === value}
              disabled={saving}
              onClick={() => setState((prev) => selectLocale(prev, value))}
              className={`rounded-sm px-md py-sm text-sm font-medium ${
                selected === value ? 'bg-surface text-primary shadow-sm' : 'text-foreground-subtle'
              }`}
            >
              {t(LOCALE_LABEL_KEYS[value])}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-lg">
        <h3 className="font-semibold text-foreground">{t('settings.previewTitle')}</h3>
        <div className="mt-md grid gap-sm sm:grid-cols-2" aria-live="polite">
          <div className="rounded-md bg-surface-muted p-md">
            <p className="text-xs text-foreground-subtle">{t('settings.previewDashboard')}</p>
            <p className="mt-sm font-semibold">{preview.status}</p>
            <p className="mt-xs text-sm text-primary">{preview.action}</p>
          </div>
          <div className="rounded-md bg-surface-muted p-md">
            <p className="text-xs text-foreground-subtle">{t('settings.previewEmail')}</p>
            <p className="mt-sm font-semibold">{preview.subject}</p>
          </div>
        </div>
      </Card>

      {status.kind === 'error' ? (
        <div
          className="flex items-center justify-between gap-sm rounded-md bg-danger-subtle px-md py-sm text-sm text-danger"
          role="alert"
        >
          {/* Written in the language the save was attempting, not the one on screen. */}
          <span>{translateWeb(status.locale, 'settings.saveFailed')}</span>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => void save(selected)}>
            {t('settings.retry')}
          </Button>
        </div>
      ) : null}

      {status.kind === 'saved' ? (
        <p className="rounded-md bg-success-subtle px-md py-sm text-sm text-success" role="status">
          {translateWeb(status.locale, 'settings.saved')}
        </p>
      ) : null}

      <div className="flex justify-end gap-sm">
        <Button
          variant="secondary"
          disabled={!pending}
          onClick={() => setState((prev) => selectLocale(prev, saved))}
        >
          {t('settings.cancel')}
        </Button>
        <Button disabled={!pending} isLoading={saving} onClick={() => void save(selected)}>
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </section>
  );
}
