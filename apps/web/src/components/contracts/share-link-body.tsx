'use client';

/**
 * ShareLinkBody — the reusable share-link settings + generation body
 * (design-spec `components/share-link-dialog/base.md`, copy
 * `messaging/share-link.md`).
 *
 * This is the shared core behind two containers: the detail screen's
 * `ShareLinkDialog` modal and the create wizard's `LinkShareStep`. Both surface
 * the exact same task — pick access settings (one validity window + optional
 * password), generate a unique open/fill link, then copy it — so the settings/
 * generate/result flow lives here once and is composed into each container.
 *
 * The body flips between two phases on one surface:
 *   • configuring → validity preset + password toggle/field + create button
 *   • generated   → the link + copy action/confirmation + its expiry note
 *
 * Containers inject what differs:
 *   • `beforeCreate` runs after validation, before `createShareLink` — the wizard
 *     uses it to persist its in-memory fields first (so `createLink` binds them).
 *   • `resultFooter` renders under the generated link — the wizard uses it for
 *     its hand-off back to the dashboard; the modal omits it (Esc/overlay dismiss).
 *
 * Security: the password lives only in this component's state and the create
 * request body. It is never persisted, logged, or rendered after generation —
 * the server returns only `requiresPassword`.
 */

import * as React from 'react';
import { Button, Field, cn } from '@repo/ui';
import { ApiError } from '@/lib/api';
import { PasswordInput } from '@/components/password-input';
import { useLocale, useTranslation } from '@/components/locale-provider';
import {
  copyToClipboard,
  createShareLink,
  DEFAULT_EXPIRY_PRESET_KEY,
  EXPIRY_PRESETS,
  expiryInput,
  expiryNote,
  findExpiryPreset,
  SHARE_PASSWORD_MIN_LENGTH,
  type ShareLink,
} from '@/lib/sharing';

export interface ShareLinkBodyProps {
  /** The contract these links belong to. */
  documentId: string;
  /** Invoked after a link is successfully created (e.g. refresh a list). */
  onCreated?: () => void;
  /**
   * Runs after client-side validation and just before `createShareLink`. Throw
   * to abort creation and surface the error in-body. The wizard uses this to
   * persist its placed fields first so `createLink` can bind them.
   */
  beforeCreate?: () => Promise<void>;
  /** Extra content rendered under the generated link (e.g. a wizard's next CTA). */
  resultFooter?: React.ReactNode;
}

export function ShareLinkBody({
  documentId,
  onCreated,
  beforeCreate,
  resultFooter,
}: ShareLinkBodyProps) {
  const t = useTranslation();
  const [presetKey, setPresetKey] = React.useState(DEFAULT_EXPIRY_PRESET_KEY);
  const [passwordOn, setPasswordOn] = React.useState(false);
  const [password, setPassword] = React.useState('');
  // Guard failures are held as a flag, not a sentence: switching language while
  // the error shows must re-render it in the new locale, not strand the old one.
  const [pwTooShort, setPwTooShort] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<ShareLink | null>(null);

  const passwordId = React.useId();
  const preset = findExpiryPreset(presetKey);

  const submit = React.useCallback(async () => {
    if (submitting) return;
    const pw = passwordOn ? password.trim() : '';
    if (passwordOn && pw.length < SHARE_PASSWORD_MIN_LENGTH) {
      setPwTooShort(true);
      return;
    }
    setPwTooShort(false);
    setCreateError(null);
    setSubmitting(true);
    try {
      // Container-supplied prerequisite (e.g. persist wizard fields) must land
      // before the link is created — createLink binds whatever fields exist.
      await beforeCreate?.();
      const created = await createShareLink(documentId, {
        ...expiryInput(preset),
        ...(pw ? { password: pw } : {}),
      });
      // Drop the plaintext from state the moment it's no longer needed.
      setPassword('');
      setLink(created);
      onCreated?.();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : t('contracts.linkCreateError'));
    } finally {
      setSubmitting(false);
    }
  }, [beforeCreate, documentId, onCreated, password, passwordOn, preset, submitting, t]);

  if (link) return <LinkResult link={link} footer={resultFooter} />;

  return (
    <form
      className="flex flex-col gap-lg"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <ExpiryPresetSelector value={presetKey} onChange={setPresetKey} disabled={submitting} />

      <PasswordSection
        on={passwordOn}
        onToggle={(next) => {
          setPasswordOn(next);
          setPwTooShort(false);
          if (!next) setPassword('');
        }}
        password={password}
        onPasswordChange={(v) => {
          setPassword(v);
          if (pwTooShort) setPwTooShort(false);
        }}
        tooShort={pwTooShort}
        passwordId={passwordId}
        disabled={submitting}
      />

      {createError ? (
        <p className="text-sm text-danger" role="alert">
          {createError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth isLoading={submitting}>
        {t(submitting ? 'contracts.linkCreating' : 'contracts.linkCreate')}
      </Button>
    </form>
  );
}

// --- validity preset selector ----------------------------------------------

function ExpiryPresetSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  const label = t('contracts.linkExpiryLabel');

  return (
    <fieldset className="flex flex-col gap-xs" disabled={disabled}>
      <legend className="text-sm font-semibold text-foreground-muted">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2xs">
        {EXPIRY_PRESETS.map((p) => {
          const selected = p.key === value;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(p.key)}
              className={cn(
                'rounded-md border px-md py-2xs text-sm font-semibold',
                'transition-[background-color,border-color,color] duration-fast ease-standard',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus',
                'disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface-muted text-foreground-muted hover:text-foreground',
              )}
            >
              {t(p.labelKey)}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-foreground-subtle">{t('contracts.linkExpiryHelp')}</p>
    </fieldset>
  );
}

// --- password section -------------------------------------------------------

function PasswordSection({
  on,
  onToggle,
  password,
  onPasswordChange,
  tooShort,
  passwordId,
  disabled,
}: {
  on: boolean;
  onToggle: (next: boolean) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  /** True once the typed password is shorter than the server will accept. */
  tooShort: boolean;
  passwordId: string;
  disabled?: boolean;
}) {
  const t = useTranslation();
  const error = tooShort
    ? t('contracts.linkPasswordTooShort', { count: SHARE_PASSWORD_MIN_LENGTH })
    : undefined;

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center justify-between gap-md">
        <span id={`${passwordId}-toggle-label`} className="text-sm font-semibold text-foreground">
          {t('contracts.linkPasswordToggle')}
        </span>
        <Switch
          checked={on}
          onChange={() => onToggle(!on)}
          disabled={disabled}
          ariaLabelledby={`${passwordId}-toggle-label`}
        />
      </div>

      {on ? (
        <Field
          htmlFor={passwordId}
          label={t('contracts.linkPasswordLabel')}
          hint={t('contracts.linkPasswordHint')}
          error={error}
        >
          <PasswordInput
            id={passwordId}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={t('contracts.linkPasswordPlaceholder')}
            autoComplete="new-password"
            invalid={tooShort}
            disabled={disabled}
            aria-describedby={`${passwordId}-message`}
          />
        </Field>
      ) : null}
    </div>
  );
}

/** A token-styled on/off switch (design-spec password toggle). */
function Switch({
  checked,
  onChange,
  disabled,
  ariaLabelledby,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabelledby: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5',
        'transition-colors duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-primary' : 'bg-border-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-5 w-5 rounded-full bg-surface shadow-sm',
          'transition-transform duration-fast ease-standard',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// --- generated phase: link + copy ------------------------------------------

function LinkResult({ link, footer }: { link: ShareLink; footer?: React.ReactNode }) {
  const { t, locale } = useLocale();
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = React.useCallback(async () => {
    try {
      await copyToClipboard(link.url);
      setCopyFailed(false);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }, [link.url]);

  return (
    <div className="flex flex-col gap-sm">
      <span className="text-sm font-semibold text-foreground-muted">{t('contracts.linkLabel')}</span>

      <div className="flex items-stretch gap-sm">
        <p
          className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-md py-3 text-sm text-foreground"
          title={link.url}
        >
          {link.url}
        </p>
        <Button
          type="button"
          variant={copied ? 'secondary' : 'primary'}
          onClick={() => void copy()}
          className="shrink-0"
        >
          {copied ? (
            <>
              <CheckIcon />
              {t('contracts.linkCopied')}
            </>
          ) : (
            t('contracts.linkCopy')
          )}
        </Button>
      </div>

      <p className="text-sm text-foreground-subtle">{expiryNote(t, locale, link)}</p>

      {/* Copy feedback announced to assistive tech. The visible toast appears
          briefly; the error is sticky until the next copy attempt. */}
      <div role="status" aria-live="polite" className="min-h-5">
        {copied ? (
          <span className="inline-flex items-center gap-2xs text-sm font-semibold text-success">
            <CheckIcon />
            {t('contracts.linkCopyToast')}
          </span>
        ) : copyFailed ? (
          <span className="text-sm text-danger">{t('contracts.linkCopyError')}</span>
        ) : null}
      </div>

      {footer ? <div className="pt-sm">{footer}</div> : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 animate-step-bounce" fill="none" aria-hidden="true">
      <path
        d="m4 10.5 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
