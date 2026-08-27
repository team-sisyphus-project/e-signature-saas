'use client';

/**
 * Wizard step 1 — upload the contract PDF.
 *
 * Drag-and-drop or file-pick a PDF, with client-side guards (type / size /
 * empty) that mirror the server's own rules (apps/api/src/common/messages.ts)
 * so the user gets the same answer instantly, before any round-trip. On a valid
 * pick the file uploads with a live progress bar; the resulting DRAFT document +
 * the local File land in wizard state, and the first page renders as a preview.
 *
 * The guards themselves live in `lib/upload.ts` and return catalog keys, so the
 * rule is testable without a browser and reads in the sender's language here.
 */

import * as React from 'react';
import { Button, cn } from '@repo/ui';
import { apiErrorMessage } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  MAX_UPLOAD_MB,
  formatFileSize,
  uploadPdf,
  validatePdfFile,
  type UploadProgress,
} from '@/lib/upload';
import { useTranslation } from '@/components/locale-provider';
import type { WebTranslate } from '@/lib/web-translations';
import { useWizard } from './wizard-context';
import { PdfPreview } from './pdf-preview';

type Phase = 'idle' | 'uploading' | 'done';

export function UploadStep() {
  const t = useTranslation();
  const { state, dispatch } = useWizard();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const [dragActive, setDragActive] = React.useState(false);
  const [progress, setProgress] = React.useState<UploadProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Filename shown while uploading (before the document summary exists).
  const [pendingName, setPendingName] = React.useState<string | null>(null);

  const phase: Phase = state.document ? 'done' : progress ? 'uploading' : 'idle';

  // Abort any in-flight upload if the step unmounts.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const startUpload = React.useCallback(
    async (file: File) => {
      const guard = validatePdfFile(file);
      if (guard) {
        setError(t(guard, { limit: MAX_UPLOAD_MB }));
        return;
      }
      setError(null);
      setPendingName(file.name);
      setProgress({ loaded: 0, total: file.size, pct: 0 });

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const document = await uploadPdf(file, {
          token: getToken() ?? undefined,
          signal: controller.signal,
          onProgress: setProgress,
        });
        dispatch({ type: 'SET_DOCUMENT', document, file });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(apiErrorMessage(t, err, 'wizard.genericError'));
      } finally {
        abortRef.current = null;
        setProgress(null);
        setPendingName(null);
      }
    },
    [dispatch, t],
  );

  const onFiles = React.useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void startUpload(file);
    },
    [startUpload],
  );

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      if (phase === 'uploading') return;
      onFiles(event.dataTransfer.files);
    },
    [onFiles, phase],
  );

  const reset = React.useCallback(() => {
    abortRef.current?.abort();
    setError(null);
    dispatch({ type: 'CLEAR_DOCUMENT' });
    if (inputRef.current) inputRef.current.value = '';
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-2xs">
        <h2 className="text-xl font-bold text-foreground">{t('wizard.uploadStepTitle')}</h2>
        <p className="text-sm text-foreground-subtle">
          {t('wizard.uploadStepSubtitle', { limit: MAX_UPLOAD_MB })}
        </p>
      </div>

      {phase === 'done' && state.file ? (
        <UploadedView
          t={t}
          fileName={state.document?.title ?? state.file.name}
          fileSize={state.file.size}
          pageCount={state.document?.pageCount ?? 0}
          file={state.file}
          onReplace={reset}
          onPageCount={(n) => {
            // Backfill page count if the server returned 0 (it parses lazily).
            if (state.document && state.document.pageCount === 0 && n > 0) {
              dispatch({ type: 'SET_DOCUMENT', document: { ...state.document, pageCount: n }, file: state.file as File });
            }
          }}
        />
      ) : phase === 'uploading' ? (
        <UploadingView
          t={t}
          fileName={pendingName ?? ''}
          progress={progress}
          onCancel={reset}
        />
      ) : (
        <DropZone
          t={t}
          dragActive={dragActive}
          inputRef={inputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onChange={(e) => onFiles(e.target.files)}
        />
      )}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DropZone({
  t,
  dragActive,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onChange,
}: {
  t: WebTranslate;
  dragActive: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border-2 border-dashed px-md py-3xl text-center',
        'transition-colors duration-base ease-standard',
        'focus-within:ring-4 focus-within:ring-focus',
        dragActive
          ? 'border-primary bg-primary-subtle'
          : 'border-border-strong bg-surface-muted hover:border-primary hover:bg-primary-subtle/40',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onChange}
      />
      <span
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-base',
          dragActive ? 'bg-primary text-primary-foreground' : 'bg-primary-subtle text-primary',
        )}
      >
        <UploadIcon />
      </span>
      <div className="flex flex-col gap-2xs">
        <span className="text-base font-bold text-foreground">
          {t(dragActive ? 'wizard.dropActive' : 'wizard.dropIdle')}
        </span>
        <span className="text-sm text-foreground-subtle">{t('wizard.dropOr')}</span>
      </div>
      <span className="pointer-events-none mt-2xs inline-flex h-9 items-center rounded-md bg-surface px-md text-sm font-semibold text-primary shadow-sm">
        {t('wizard.dropPick')}
      </span>
    </label>
  );
}

function UploadingView({
  t,
  fileName,
  progress,
  onCancel,
}: {
  t: WebTranslate;
  fileName: string;
  progress: UploadProgress | null;
  onCancel: () => void;
}) {
  const pct = progress?.pct ?? 0;
  // The upload byte-stream finishes before the server parses pages; past 100%
  // we switch to an indeterminate "preparing" message instead of a stuck bar.
  const preparing = pct >= 100;

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-border bg-surface p-lg">
      <div className="flex items-center gap-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
          <FileIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2xs">
          <span className="truncate text-sm font-semibold text-foreground">{fileName}</span>
          <span className="text-xs text-foreground-subtle">
            {preparing
              ? t('wizard.uploadPreparing')
              : t('wizard.uploadProgress', { percent: pct })}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('wizard.cancel')}
        </Button>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-grey-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={preparing ? undefined : pct}
        aria-label={t('wizard.uploadProgressLabel')}
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-[width] duration-base ease-out-expressive',
            preparing && 'animate-pulse',
          )}
          style={{ width: `${Math.max(pct, preparing ? 100 : 4)}%` }}
        />
      </div>
    </div>
  );
}

function UploadedView({
  t,
  fileName,
  fileSize,
  pageCount,
  file,
  onReplace,
  onPageCount,
}: {
  t: WebTranslate;
  fileName: string;
  fileSize: number;
  pageCount: number;
  file: File;
  onReplace: () => void;
  onPageCount: (pageCount: number) => void;
}) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center gap-sm rounded-lg border border-border bg-surface p-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success-subtle text-success">
          <CheckIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2xs">
          <span className="truncate text-sm font-semibold text-foreground">{fileName}</span>
          <span className="text-xs text-foreground-subtle">
            {[
              formatFileSize(fileSize),
              pageCount > 0 ? t('wizard.pageCount', { count: pageCount }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReplace}>
          {t('wizard.replaceFile')}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted p-md">
        <PdfPreview file={file} onPageCount={onPageCount} className="mx-auto max-w-[560px]" />
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 10.5 8.5 14 15 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
