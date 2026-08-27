'use client';

/**
 * CompletionDownload — the completed-document download area.
 *
 * Presentational + self-contained per-row loading/error state; the caller
 * supplies `onDownload(kind)` wired to its own auth (owner JWT on the dashboard,
 * signer session on the completion screen). Reuses the existing StatusBadge and
 * Button — no new visual primitives. Until the artifacts are stored the rows
 * show a skeleton-shimmer placeholder; once ready they become one row per
 * artifact (signed contract / audit trail certificate).
 *
 * Every sentence comes from the `common` catalog domain, so the sender's
 * dashboard and the signer's completion takeover always name the two files the
 * same way — in whichever language each reader resolved.
 */

import * as React from 'react';
import { Button, Skeleton, cn } from '@repo/ui';
import { StatusBadge } from '@/components/status-badge';
import { apiErrorMessage } from '@/lib/api';
import {
  COMPLETION_ARTIFACTS,
  COMPLETION_ARTIFACT_KEYS,
  formatKstDateTime,
  type CompletionArtifact,
} from '@/lib/completion-download';
import { useTranslation } from '@/components/locale-provider';

export interface CompletionDownloadProps {
  /** Whether artifacts are stored and downloadable; false → skeleton placeholder. */
  ready: boolean;
  /** ISO completion timestamp for the notice (optional). */
  completedAt?: string | null;
  /** Server-supplied status label for the badge; falls back to the catalog. */
  statusLabel?: string;
  /** Show the COMPLETED status badge beside the section title. */
  showBadge?: boolean;
  /** Download one artifact; rejects with a user-facing message on failure. */
  onDownload: (kind: CompletionArtifact) => Promise<void>;
  className?: string;
}

export function CompletionDownload({
  ready,
  completedAt,
  statusLabel,
  showBadge = true,
  onDownload,
  className,
}: CompletionDownloadProps) {
  const t = useTranslation();
  const completedLabel = formatKstDateTime(completedAt ?? null);
  const resolvedStatusLabel = statusLabel ?? t('common.completionStatus');

  return (
    <section
      className={cn('flex flex-col gap-sm text-left', className)}
      aria-label={t('common.completionTitle')}
    >
      <div className="flex items-center justify-between gap-xs">
        <h4 className="text-sm font-bold text-foreground">
          {t('common.completionTitle')}
        </h4>
        {showBadge ? <StatusBadge status="COMPLETED" label={resolvedStatusLabel} /> : null}
      </div>

      {completedLabel ? (
        <p className="text-sm text-foreground-subtle">
          {t('common.completionNotice', { completedAt: completedLabel })}
        </p>
      ) : null}

      {ready ? (
        <ul className="flex flex-col gap-sm">
          {COMPLETION_ARTIFACTS.map((kind) => (
            <li key={kind}>
              <DownloadRow kind={kind} onDownload={onDownload} />
            </li>
          ))}
        </ul>
      ) : (
        <PreparingPlaceholder />
      )}
    </section>
  );
}

function DownloadRow({
  kind,
  onDownload,
}: {
  kind: CompletionArtifact;
  onDownload: (kind: CompletionArtifact) => Promise<void>;
}) {
  const t = useTranslation();
  const item = COMPLETION_ARTIFACT_KEYS[kind];
  const [loading, setLoading] = React.useState(false);
  // Holds a resolved sentence only because it may be the server's own copy;
  // the fallback is resolved through the catalog at the moment of failure.
  const [error, setError] = React.useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDownload(kind);
    } catch (err) {
      setError(apiErrorMessage(t, err, 'common.completionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2xs rounded-md border border-border bg-surface-muted px-md py-sm">
      <div className="flex items-center justify-between gap-md">
        <div className="flex min-w-0 flex-col gap-2xs">
          <p className="truncate text-base font-semibold text-foreground">{t(item.title)}</p>
          <p className="text-sm text-foreground-subtle">{t(item.description)}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={loading}
          onClick={handle}
          className="shrink-0"
        >
          {t('common.completionDownload')}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Skeleton-shimmer placeholder shown while post-processing stores the files. */
function PreparingPlaceholder() {
  const t = useTranslation();
  return (
    <div className="flex flex-col gap-sm">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-md rounded-md border border-border bg-surface-muted px-md py-sm"
        >
          <div className="flex flex-1 flex-col gap-2xs">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton shape="rect" className="h-9 w-20" />
        </div>
      ))}
      <p className="text-sm text-foreground-subtle">{t('common.completionPreparing')}</p>
    </div>
  );
}
