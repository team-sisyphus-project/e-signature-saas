'use client';

/**
 * ShareLinkPasswordEditor — the inline password view/edit panel for one share
 * link row (design-spec conventions/share-link-password-admin.md, grain-3).
 *
 * Opened from a link row's password trigger. On mount it fetches the link's
 * current password state (grain-2 owner-only API) and reflects one of the three
 * semantic states:
 *   • no password        → empty field, "this link has no password" hint.
 *   • confirmable        → field pre-filled with the plaintext (masked; the
 *                          shared PasswordInput's reveal toggle shows it on demand).
 *   • legacy (unrecoverable) → empty field, "the password set earlier cannot be
 *                          shown" hint — set a new one to make it viewable again.
 *
 * The same field serves viewing and editing: the owner sees the current value
 * (masked), reveals it if they want, edits it, and saves — taking effect
 * immediately (the next unlock reads the fresh value). Save replaces the
 * password; remove drops protection entirely. On success `onChanged` hands the
 * updated link view back to the section so the row's password tag stays in sync.
 *
 * Security: the plaintext lives only in this component's local state while the
 * panel is open. It is dropped on close/remove and never persisted or logged; the
 * server returns only `requiresPassword` on the link view.
 */

import * as React from 'react';
import { Button, Field } from '@repo/ui';
import { ApiError } from '@/lib/api';
import { PasswordInput } from '@/components/password-input';
import { useTranslation } from '@/components/locale-provider';
import {
  getShareLinkPassword,
  passwordEditorInitialValue,
  passwordStateHint,
  SHARE_PASSWORD_MIN_LENGTH,
  updateShareLinkPassword,
  type ShareLink,
  type ShareLinkPasswordView,
} from '@/lib/sharing';
import type { WebTranslationKey } from '@/lib/web-translations';

/**
 * The panel's outcome line. It holds a catalog *key* rather than a sentence, so
 * changing language while a result is on screen re-renders it in the new locale
 * instead of stranding the old one. A server-sent message is the one exception —
 * it arrives as text and has no key (milestone 4 moves it into the catalog).
 */
type Feedback =
  | { tone: 'success' | 'error'; key: WebTranslationKey }
  | { tone: 'error'; text: string }
  | null;
type Busy = 'save' | 'remove' | null;

export interface ShareLinkPasswordEditorProps {
  documentId: string;
  link: ShareLink;
  /** Element id of this panel (for the trigger's aria-controls). */
  id: string;
  /** Called with the server's updated link view after a save/remove. */
  onChanged: (updated: ShareLink) => void;
}

export function ShareLinkPasswordEditor({
  documentId,
  link,
  id,
  onChanged,
}: ShareLinkPasswordEditorProps) {
  const t = useTranslation();
  const [view, setView] = React.useState<ShareLinkPasswordView | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [value, setValue] = React.useState('');
  const [initial, setInitial] = React.useState('');
  const [pwTooShort, setPwTooShort] = React.useState(false);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [feedback, setFeedback] = React.useState<Feedback>(null);

  const fieldId = `${id}-input`;

  // Fetch the current password state once when the panel opens.
  React.useEffect(() => {
    let active = true;
    setLoadError(null);
    getShareLinkPassword(documentId, link.id)
      .then((next) => {
        if (!active) return;
        const start = passwordEditorInitialValue(next);
        setView(next);
        setValue(start);
        setInitial(start);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof ApiError ? err.message : t('contracts.linkPasswordLoadError'));
      });
    return () => {
      active = false;
    };
  }, [documentId, link.id, t]);

  const trimmed = value.trim();
  // Save is meaningful only for a non-empty value that differs from what loaded
  // (re-saving the same confirmable value would be a no-op). Removal is a
  // separate, explicit action so an accidental empty save can't drop protection.
  const canSave = busy === null && trimmed.length > 0 && value !== initial;
  // Offer removal whenever a password is currently set (disabled while any op runs),
  // plus during its own removal so the button doesn't vanish mid-request.
  const showRemove = Boolean(view?.hasPassword) || busy === 'remove';

  const save = React.useCallback(async () => {
    if (trimmed.length < SHARE_PASSWORD_MIN_LENGTH) {
      setPwTooShort(true);
      return;
    }
    setPwTooShort(false);
    setFeedback(null);
    setBusy('save');
    const wasSet = Boolean(view?.hasPassword);
    try {
      const updated = await updateShareLinkPassword(documentId, link.id, trimmed);
      // Reflect the just-saved value as the new confirmable baseline.
      setView({ hasPassword: true, recoverable: true, password: trimmed });
      setInitial(trimmed);
      setFeedback({
        tone: 'success',
        key: wasSet ? 'contracts.linkPasswordSavedChanged' : 'contracts.linkPasswordSavedSet',
      });
      onChanged(updated);
    } catch (err) {
      setFeedback(saveFailure(err));
    } finally {
      setBusy(null);
    }
  }, [documentId, link.id, onChanged, trimmed, view]);

  const remove = React.useCallback(async () => {
    setPwTooShort(false);
    setFeedback(null);
    setBusy('remove');
    try {
      const updated = await updateShareLinkPassword(documentId, link.id, null);
      setView({ hasPassword: false, recoverable: false, password: null });
      setValue('');
      setInitial('');
      setFeedback({ tone: 'success', key: 'contracts.linkPasswordSavedRemoved' });
      onChanged(updated);
    } catch (err) {
      setFeedback(saveFailure(err));
    } finally {
      setBusy(null);
    }
  }, [documentId, link.id, onChanged]);

  return (
    <div id={id} className="flex flex-col gap-sm rounded-md border border-border bg-surface-muted p-md">
      {loadError ? (
        <p className="text-sm text-danger" role="alert">
          {loadError}
        </p>
      ) : view === null ? (
        <p className="text-sm text-foreground-subtle" role="status">
          {t('contracts.linkPasswordLoading')}
        </p>
      ) : (
        <>
          <Field
            htmlFor={fieldId}
            label={t('contracts.linkPasswordLabel')}
            hint={passwordStateHint(t, view)}
            error={
              pwTooShort
                ? t('contracts.linkPasswordTooShort', { count: SHARE_PASSWORD_MIN_LENGTH })
                : undefined
            }
          >
            <PasswordInput
              id={fieldId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (pwTooShort) setPwTooShort(false);
                if (feedback) setFeedback(null);
              }}
              placeholder={t('contracts.linkPasswordPlaceholder')}
              autoComplete="off"
              invalid={pwTooShort}
              disabled={busy !== null}
              aria-describedby={`${fieldId}-message`}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-xs">
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              isLoading={busy === 'save'}
              disabled={!canSave}
            >
              {t(busy === 'save' ? 'contracts.linkPasswordSaving' : 'contracts.linkPasswordSave')}
            </Button>
            {showRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void remove()}
                isLoading={busy === 'remove'}
                disabled={busy !== null}
                className="text-danger hover:bg-danger-subtle"
              >
                {t(
                  busy === 'remove'
                    ? 'contracts.linkPasswordRemoving'
                    : 'contracts.linkPasswordRemove',
                )}
              </Button>
            ) : null}
          </div>
        </>
      )}

      {/* Save/remove outcome announced to assistive tech. */}
      <div role="status" aria-live="polite" className="min-h-4">
        {feedback ? (
          <span
            className={
              feedback.tone === 'success'
                ? 'text-xs font-semibold text-success'
                : 'text-xs text-danger'
            }
            role={feedback.tone === 'error' ? 'alert' : undefined}
          >
            {'key' in feedback ? t(feedback.key) : feedback.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A failed save/remove: the server's own message when it sent one (it is more
 * specific than our catch-all), otherwise the catalog's.
 */
function saveFailure(err: unknown): Feedback {
  return err instanceof ApiError
    ? { tone: 'error', text: err.message }
    : { tone: 'error', key: 'contracts.linkPasswordSaveError' };
}
