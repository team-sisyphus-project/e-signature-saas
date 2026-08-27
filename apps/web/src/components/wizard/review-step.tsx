'use client';

/**
 * Wizard step 4 — review & send.
 *
 * The last step has two faces:
 *
 *   1. Review summary — a read-back of what's about to go out (document, placed
 *      fields, recipients in signing order) plus this step's own send CTA. The
 *      shell deliberately leaves its footer-right empty here so the send button
 *      lives with the content it confirms.
 *   2. Success — the celebratory takeover shown once the dispatch lands, with
 *      the SuccessCheck stroke-draw + a Confetti burst (pure-CSS,
 *      reduced-motion-safe) and a staggered text fade-in.
 *
 * Sending is two ordered calls (save fields → send); see `lib/send.ts`. On
 * failure we surface the server's message and let the user retry; a 401 means
 * the session lapsed, so we bounce to /login. On success we stash the just-sent
 * summary via `writeSentSignal` so the dashboard shows the contract as in
 * progress the instant we route back.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button, Confetti, SuccessCheck } from '@repo/ui';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { writeSentSignal, type DocumentSummary } from '@/lib/documents';
import { FIELD_TYPES, fieldTypeLabel, type SignFieldType } from '@/lib/field-geometry';
import { recipientLabel } from '@/lib/recipients';
import { saveFields, sendContract } from '@/lib/send';
import { useTranslation } from '@/components/locale-provider';
import type { WebTranslate, WebTranslationKey } from '@/lib/web-translations';
import { useWizard, type RecipientDraft, type SignFieldDraft } from './wizard-context';

type SendState = 'idle' | 'sending' | 'error';

export function ReviewStep() {
  const router = useRouter();
  const t = useTranslation();
  const { state } = useWizard();
  const { document, fields, recipients } = state;

  const [status, setStatus] = React.useState<SendState>('idle');
  // Already-resolved copy: either one of our own catalog sentences, or the
  // server's message passed through verbatim.
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<DocumentSummary | null>(null);
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledSendAt, setScheduledSendAt] = React.useState('');
  const [minimumScheduleTime] = React.useState(() => nextMinuteLocalDateTime());

  const canSend =
    document !== null && fields.length > 0 && recipients.length > 0 && status !== 'sending';

  const handleSend = React.useCallback(async () => {
    if (!document) return;
    const scheduledFor = isScheduled ? new Date(scheduledSendAt) : null;
    if (isScheduled && !scheduledSendAt) {
      setError(t('wizard.scheduleRequired'));
      setStatus('error');
      return;
    }
    if (scheduledFor && (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now())) {
      setError(t('wizard.scheduleFuture'));
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const token = getToken() ?? undefined;
      // Fields must be persisted before send: the server maps saved fields to
      // recipients by index. Order matters — save, then dispatch.
      await saveFields(document.id, fields, token);
      const summary = await sendContract(
        document.id,
        recipients,
        token,
        scheduledFor?.toISOString(),
      );
      // Hand the fresh contract to the dashboard so its new status is visible at once.
      writeSentSignal(summary);
      setSent(summary);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(apiErrorMessage(t, err, 'wizard.genericError'));
      setStatus('error');
    }
  }, [document, fields, isScheduled, recipients, router, scheduledSendAt, t]);

  const goToDashboard = React.useCallback(() => router.push('/dashboard'), [router]);

  if (sent) {
    return (
      <SendSuccess t={t} scheduled={sent.status === 'SCHEDULED'} onContinue={goToDashboard} />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-2xs">
        <h2 className="text-xl font-bold text-foreground">{t('wizard.reviewTitle')}</h2>
        <p className="text-sm text-foreground-subtle">{t('wizard.reviewSubhead')}</p>
      </header>

      <DocumentSummaryCard t={t} document={document} fieldCount={fields.length} />
      <FieldsSummaryCard t={t} fields={fields} />
      <RecipientsSummaryCard t={t} recipients={recipients} />

      <ScheduleSendCard
        t={t}
        checked={isScheduled}
        min={minimumScheduleTime}
        value={scheduledSendAt}
        onCheckedChange={(checked) => {
          setIsScheduled(checked);
          setError(null);
          setStatus('idle');
        }}
        onValueChange={(value) => {
          setScheduledSendAt(value);
          setError(null);
          setStatus('idle');
        }}
      />

      {status === 'error' && error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-subtle px-md py-sm text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        size="lg"
        onClick={() => void handleSend()}
        disabled={!canSend}
        isLoading={status === 'sending'}
        className="w-full"
      >
        {t(sendButtonKey(status, isScheduled))}
      </Button>
    </div>
  );
}

/** The send button's label: in-flight state first, then failure, then intent. */
function sendButtonKey(status: SendState, scheduled: boolean): WebTranslationKey {
  if (status === 'sending') return scheduled ? 'wizard.scheduling' : 'wizard.sending';
  if (status === 'error') return 'wizard.retry';
  return scheduled ? 'wizard.scheduledSend' : 'wizard.send';
}

function ScheduleSendCard({
  t,
  checked,
  min,
  value,
  onCheckedChange,
  onValueChange,
}: {
  t: WebTranslate;
  checked: boolean;
  min: string;
  value: string;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-md rounded-lg border border-border bg-surface p-lg">
      <div className="flex items-center justify-between gap-md">
        <div className="flex flex-col gap-2xs">
          <h3 className="text-base font-bold text-foreground">{t('wizard.schedule')}</h3>
          <p className="text-sm text-foreground-subtle">{t('wizard.scheduleDescription')}</p>
        </div>
        <label className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            role="switch"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="peer sr-only"
            aria-label={t('wizard.schedule')}
          />
          <span className="h-7 w-12 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
          <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {checked ? (
        <div className="flex flex-col gap-xs">
          <label htmlFor="scheduled-send-at" className="text-sm font-semibold text-foreground">
            {t('wizard.scheduleDateTime')}
          </label>
          <input
            id="scheduled-send-at"
            type="datetime-local"
            value={value}
            min={min}
            onChange={(event) => onValueChange(event.target.value)}
            required
            className="h-11 w-full rounded-md border border-border bg-background px-sm text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-foreground-subtle">{t('wizard.scheduleHint')}</p>
        </div>
      ) : null}
    </section>
  );
}

/** Native datetime-local values are local time without a UTC suffix. */
function nextMinuteLocalDateTime(now = new Date()): string {
  const value = new Date(now);
  value.setSeconds(0, 0);
  value.setMinutes(value.getMinutes() + 1);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

// --- review summary cards ---------------------------------------------------

function SummaryCard({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-sm rounded-lg border border-border bg-surface p-lg">
      <div className="flex items-center justify-between gap-sm">
        <h3 className="text-sm font-bold text-foreground-muted">{title}</h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function DocumentSummaryCard({
  t,
  document,
  fieldCount,
}: {
  t: WebTranslate;
  document: DocumentSummary | null;
  fieldCount: number;
}) {
  return (
    <SummaryCard title={t('wizard.sectionDocument')}>
      <div className="flex items-center gap-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
          <DocumentIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2xs">
          <p className="truncate text-base font-bold text-foreground">
            {document?.title ?? t('wizard.untitledDocument')}
          </p>
          <p className="text-sm text-foreground-subtle">{docMeta(t, document, fieldCount)}</p>
        </div>
      </div>
    </SummaryCard>
  );
}

/**
 * The document card's meta line. Each segment is a whole catalog sentence and
 * the middle dot is punctuation, not grammar — so neither locale inherits the
 * other's word order.
 */
function docMeta(t: WebTranslate, document: DocumentSummary | null, fieldCount: number): string {
  const parts: string[] = [];
  if (document && document.pageCount > 0) {
    parts.push(t('wizard.pageCount', { count: document.pageCount }));
  }
  parts.push(t('wizard.docFieldCount', { count: fieldCount }));
  return parts.join(' · ');
}

function FieldsSummaryCard({ t, fields }: { t: WebTranslate; fields: SignFieldDraft[] }) {
  // Count per type, in the canonical type order, dropping zero-count types.
  const counts = React.useMemo(() => {
    const acc: Record<SignFieldType, number> = { SIGNATURE: 0, DATE: 0, TEXT: 0 };
    for (const f of fields) acc[f.type] += 1;
    return acc;
  }, [fields]);

  return (
    <SummaryCard
      title={t('wizard.sectionFields')}
      trailing={
        <span className="text-sm font-semibold text-foreground-subtle">
          {t('wizard.fieldsTotal', { count: fields.length })}
        </span>
      }
    >
      <ul className="flex flex-wrap gap-xs">
        {FIELD_TYPES.filter((type) => counts[type] > 0).map((type) => (
          <li
            key={type}
            className="flex items-center gap-2xs rounded-full bg-primary-subtle px-sm py-2xs text-sm font-medium text-primary"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <FieldGlyph type={type} />
            </span>
            {t('wizard.fieldTypeCount', {
              field: fieldTypeLabel(t, type),
              count: counts[type],
            })}
          </li>
        ))}
      </ul>
    </SummaryCard>
  );
}

function RecipientsSummaryCard({
  t,
  recipients,
}: {
  t: WebTranslate;
  recipients: RecipientDraft[];
}) {
  return (
    <SummaryCard
      title={t('wizard.sectionRecipients')}
      trailing={
        <span className="text-sm font-semibold text-foreground-subtle">
          {t('wizard.recipientCount', { count: recipients.length })}
        </span>
      }
    >
      <ol className="flex flex-col gap-xs">
        {recipients.map((r, i) => (
          <li key={r.id} className="flex items-center gap-sm">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary"
              aria-label={t('wizard.signingOrderLabel', { index: i + 1 })}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {recipientLabel(t, r, i)}
              </span>
              <span className="truncate text-sm text-foreground-subtle">{r.email.trim()}</span>
            </div>
          </li>
        ))}
      </ol>
    </SummaryCard>
  );
}

// --- success takeover -------------------------------------------------------

/**
 * Full-viewport celebration. Covers the wizard chrome (header/footer) so the
 * SuccessCheck + Confetti own the moment. The check ring/tick stroke-draw, the
 * confetti bursts once from the mark's center, and the text fades in staggered
 * just behind them. Under reduced-motion the global fallback collapses every
 * animation to its static end-state (check fully drawn, confetti invisible).
 *
 * Rendered through a portal to <body>: the wizard's step container keeps a
 * `transform` (the wizard-step slide, `both` fill), which would otherwise become
 * the containing block for a `position: fixed` child and trap the overlay inside
 * the 760px column. The portal escapes that ancestor so the takeover is truly
 * full-viewport.
 */
function SendSuccess({
  t,
  scheduled,
  onContinue,
}: {
  t: WebTranslate;
  scheduled: boolean;
  onContinue: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const title = t(scheduled ? 'wizard.scheduledSuccessTitle' : 'wizard.sendSuccessTitle');
  const body = t(scheduled ? 'wizard.scheduledSuccessBody' : 'wizard.sendSuccessBody');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-xl bg-background px-md text-center"
    >
      <div className="relative flex items-center justify-center">
        <Confetti className="z-0" />
        <SuccessCheck size={112} className="relative z-10" label={title} />
      </div>

      <div className="flex max-w-[420px] flex-col items-center gap-sm">
        <h1
          className="animate-fade-in-up text-2xl font-bold text-foreground"
          style={{ animationDelay: '350ms' }}
        >
          {title}
        </h1>
        <p
          className="animate-fade-in-up text-base text-foreground-subtle"
          style={{ animationDelay: '470ms' }}
        >
          {body}
        </p>
        <Button
          size="lg"
          onClick={onContinue}
          className="animate-fade-in-up mt-sm w-full sm:w-auto"
          style={{ animationDelay: '600ms' }}
        >
          {t('wizard.toDashboard')}
        </Button>
      </div>
    </div>,
    window.document.body,
  );
}

// --- icons ------------------------------------------------------------------

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M8.5 13h7M8.5 16.5h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldGlyph({ type }: { type: SignFieldType }) {
  if (type === 'SIGNATURE') {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M2 12c2-1 3-7 5-7s1 5 3 5 2-3 4-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'DATE') {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4 4h8M8 4v8M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
