'use client';

/**
 * DocumentViewer — the recipient's mobile-first reading + filling surface.
 *
 * After access is granted, this renders the contract PDF fit-to-width as a
 * vertical, multi-page scroll (skeleton-shimmer per page while it rasterizes).
 * Each assigned field is overlaid on its page via `normToPx`: an unfilled field
 * breathes with a pulse highlight and a "tap here" affordance; a filled field
 * shows its captured value inline. The contract body itself is a rasterized
 * image — only the overlaid fields are interactive, so the recipient can read
 * but never edit the document text. A safe-area-aware bottom CTA tracks
 * progress and finalizes once nothing is left.
 *
 * The recipient holds no File, so the document is streamed from the
 * session-guarded PDF endpoint (`pdfUrl`) and opened with `loadPdfFromUrl`. All
 * flow-specific wiring — the PDF URL, the bearer session, the save endpoint, and
 * copy — comes from the {@link useFill} adapter, so the OTP signer flow and the
 * link-share recipient flow reuse this one screen verbatim.
 */

import * as React from 'react';
import { Button, Skeleton, cn } from '@repo/ui';
import { ApiError } from '@/lib/api';
import { brandStyle } from '@/lib/branding';
import {
  loadPdfFromUrl,
  renderPageToCanvas,
  isRenderCancelled,
  PDF_READ_ERROR_KEY,
  PdfRenderError,
  type PdfDocument,
} from '@/lib/pdf';
import { fieldTypeLabel, normToPx, type PageSize } from '@/lib/field-geometry';
import type { FillCopy } from '@/lib/fill-copy';
import { useFill, type FillField, type FillFieldValue } from './fill-context';
import { BrandingHeader } from './branding-header';
import { SignatureInputSheet } from './signature-sheet';
import { useTranslation } from '@/components/locale-provider';
import type { WebTranslationKey } from '@/lib/web-translations';

type LoadStatus = 'loading' | 'ready' | 'error';

/** Stable DOM id so the CTA / a tap can scroll a field into view. */
function fieldDomId(id: string): string {
  return `fill-field-${id}`;
}

/** A field is done when a value was captured, or the server already has one. */
function isFilled(field: FillField, values: Record<string, FillFieldValue>): boolean {
  return values[field.id] != null || field.filled;
}

/** Top edge (px) of a field on its page — for top-to-bottom reading order. */
function topOf(field: FillField): number {
  return 1 - field.y - field.height; // normalized; page-height-independent ordering
}

export function DocumentViewer() {
  const t = useTranslation();
  const {
    sender,
    brandColor,
    documentTitle,
    payload,
    fieldValues,
    pdfUrl,
    loadSession,
    openField,
    complete,
    copy,
  } = useFill();

  // Finalize state for the bottom CTA. A failed `complete` keeps every captured
  // value in place (the context never clears them), so the recipient just retries.
  const [completing, setCompleting] = React.useState(false);
  // Server-authored rejection text, or `true` for the catalog's own fallback.
  const [completeError, setCompleteError] = React.useState<string | true | null>(null);

  const session = React.useMemo(() => loadSession(), [loadSession]);
  const fields = React.useMemo(() => payload?.fields ?? [], [payload]);

  const [doc, setDoc] = React.useState<PdfDocument | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [status, setStatus] = React.useState<LoadStatus>('loading');
  // A render failure carries the renderer's own message; everything else is the
  // catalog's neutral line, resolved at render time so it follows the locale.
  // A catalog key, never a sentence — see `template-field-preview.tsx`.
  const [renderError, setRenderError] = React.useState<WebTranslationKey | null>(null);

  // Open the streamed PDF once per session; dispose on unmount.
  React.useEffect(() => {
    if (!session) {
      setStatus('error');
      setRenderError(null);
      return;
    }
    let disposed = false;
    let opened: PdfDocument | null = null;
    setStatus('loading');
    loadPdfFromUrl(pdfUrl, {
      headers: { Authorization: `Bearer ${session}` },
      cache: 'no-store',
    })
      .then((result) => {
        if (disposed) {
          void result.doc.destroy();
          return;
        }
        opened = result.doc;
        setDoc(result.doc);
        setPageCount(result.pageCount);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (disposed) return;
        setRenderError(err instanceof PdfRenderError ? PDF_READ_ERROR_KEY : null);
        setStatus('error');
      });
    return () => {
      disposed = true;
      void opened?.destroy();
    };
  }, [pdfUrl, session]);

  // Measure the page column so each page rasterizes exactly fit-to-width.
  const pagesRef = React.useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    const measure = () => setPageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure the fixed CTA so the last page can clear it when scrolled to bottom.
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const [ctaHeight, setCtaHeight] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const measure = () => setCtaHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const orderedUnfilled = React.useMemo(
    () =>
      [...fields]
        .filter((f) => !isFilled(f, fieldValues))
        .sort((a, b) => a.page - b.page || topOf(a) - topOf(b) || a.x - b.x),
    [fields, fieldValues],
  );
  const remaining = orderedUnfilled.length;
  const total = fields.length;

  const scrollToField = React.useCallback((id: string) => {
    document.getElementById(fieldDomId(id))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const onFieldTap = React.useCallback(
    (field: FillField) => {
      scrollToField(field.id);
      openField(field.id);
    },
    [openField, scrollToField],
  );

  const onCta = React.useCallback(async () => {
    const next = orderedUnfilled[0];
    if (next) {
      scrollToField(next.id);
      openField(next.id);
      return;
    }
    // All fields captured: finalize. On success the flow flips to `done` and this
    // viewer unmounts for the completion screen; on failure we surface the
    // server's Toss-tone message and let the recipient retry (values are kept).
    if (completing) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      await complete();
    } catch (err) {
      const serverMessage = err instanceof ApiError ? err.serverMessage : null;
      setCompleteError(serverMessage?.trim() ? serverMessage : true);
      setCompleting(false);
    }
  }, [orderedUnfilled, scrollToField, openField, complete, completing]);

  const progress =
    total === 0
      ? t(copy.progressNone)
      : remaining === 0
        ? t(copy.progressAllDone)
        : t(copy.progress, { total, done: total - remaining });

  return (
    <main
      style={brandStyle(brandColor)}
      className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-lg pt-xl"
    >
      <BrandingHeader sender={sender} />

      <div className="mt-lg">
        <h1 className="truncate text-xl font-bold text-foreground">
          {payload?.documentTitle ?? documentTitle}
        </h1>
        <p className="mt-2xs text-sm text-foreground-subtle">{progress}</p>
      </div>

      <div
        ref={pagesRef}
        className="mt-lg flex flex-col gap-lg"
        // Clear the fixed CTA at the end of the scroll (layout clearance, not a
        // design value — derived from the bar's measured height).
        style={{ paddingBottom: ctaHeight ? ctaHeight + 24 : undefined }}
      >
        {status === 'error' ? (
          <div className="flex aspect-[1/1.414] w-full flex-col items-center justify-center gap-xs rounded-md border border-border bg-surface-muted px-md text-center">
            <p className="text-sm text-foreground-muted">{t(renderError ?? copy.loadError)}</p>
          </div>
        ) : status === 'loading' || !doc || pageWidth === 0 ? (
          <Skeleton className="aspect-[1/1.414] w-full" />
        ) : (
          Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
            <PdfPageView
              key={pageNumber}
              doc={doc}
              pageNumber={pageNumber}
              width={pageWidth}
              fields={fields.filter((f) => f.page === pageNumber)}
              fieldValues={fieldValues}
              affordance={copy.fieldAffordance}
              onFieldTap={onFieldTap}
            />
          ))
        )}
      </div>

      <div
        ref={ctaRef}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto w-full max-w-[480px] px-lg py-md">
          {completeError ? (
            <p
              role="alert"
              aria-live="assertive"
              className="mb-xs text-center text-sm text-danger"
            >
              {completeError === true ? t(copy.completeError) : completeError}
            </p>
          ) : null}
          <Button fullWidth size="lg" onClick={onCta} isLoading={completing}>
            {t(remaining > 0 ? copy.ctaContinue : copy.ctaComplete)}
          </Button>
        </div>
      </div>

      {/* The capture BottomSheet targets the field opened via the fill context. */}
      <SignatureInputSheet />
    </main>
  );
}

interface PdfPageViewProps {
  doc: PdfDocument;
  pageNumber: number;
  /** Fit-to-width target in CSS px. */
  width: number;
  fields: FillField[];
  fieldValues: Record<string, FillFieldValue>;
  affordance: FillCopy['fieldAffordance'];
  onFieldTap: (field: FillField) => void;
}

/** One PDF page rasterized fit-to-width, with its field overlay on top. */
function PdfPageView({
  doc,
  pageNumber,
  width,
  fields,
  fieldValues,
  affordance,
  onFieldTap,
}: PdfPageViewProps) {
  const t = useTranslation();
  const { copy } = useFill();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [pageSize, setPageSize] = React.useState<PageSize | null>(null);
  const [status, setStatus] = React.useState<LoadStatus>('loading');

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    let cancelled = false;
    setStatus('loading');
    renderPageToCanvas(doc, pageNumber, canvas, width)
      .then((size) => {
        if (cancelled) return;
        setPageSize({ width: size.cssWidth, height: size.cssHeight });
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled || isRenderCancelled(err)) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, width]);

  const ready = status === 'ready' && pageSize !== null;

  return (
    <div className="relative w-full">
      {ready ? null : status === 'error' ? (
        <div className="flex aspect-[1/1.414] w-full items-center justify-center rounded-sm border border-border bg-surface-muted px-md text-center">
          <p className="text-sm text-foreground-muted">{t(copy.pageError, { page: pageNumber })}</p>
        </div>
      ) : (
        <Skeleton className="aspect-[1/1.414] w-full" />
      )}

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('signer.viewerPageLabel', { page: pageNumber })}
        className={cn(
          'block w-full rounded-sm border border-border bg-surface shadow-sm',
          ready ? 'animate-fade-in' : 'hidden',
        )}
      />

      {ready && pageSize ? (
        <div className="absolute inset-0">
          {fields.map((field) => (
            <FieldOverlay
              key={field.id}
              field={field}
              pageSize={pageSize}
              value={fieldValues[field.id]}
              affordance={affordance}
              onTap={() => onFieldTap(field)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface FieldOverlayProps {
  field: FillField;
  pageSize: PageSize;
  value: FillFieldValue | undefined;
  affordance: FillCopy['fieldAffordance'];
  onTap: () => void;
}

/** A single field box positioned over the page: pulse affordance, or its value. */
function FieldOverlay({ field, pageSize, value, affordance, onTap }: FieldOverlayProps) {
  const t = useTranslation();
  const rect = normToPx(field, pageSize);
  const style: React.CSSProperties = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  const label = fieldTypeLabel(t, field.type);

  if (value != null || field.filled) {
    return (
      <div
        id={fieldDomId(field.id)}
        aria-label={t('signer.fieldDoneLabel', { label })}
        className="absolute flex items-center justify-center overflow-hidden rounded-sm border border-success bg-success-subtle/30"
        style={style}
      >
        <FieldValueContent value={value} label={label} />
      </div>
    );
  }

  return (
    <button
      type="button"
      id={fieldDomId(field.id)}
      onClick={onTap}
      aria-label={t('signer.fieldInputLabel', { label })}
      className={cn(
        'field-pulse animate-breathing-pulse absolute flex items-center justify-center rounded-sm',
        'border-2 border-primary bg-primary-subtle/40 text-2xs font-bold text-primary',
        'transition-transform duration-fast ease-standard active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus',
      )}
      style={style}
    >
      <span className="pointer-events-none truncate px-2xs leading-none">
        {t(affordance[field.type])}
      </span>
    </button>
  );
}

/** Renders the captured value inside a filled field box. */
function FieldValueContent({
  value,
  label,
}: {
  value: FillFieldValue | undefined;
  /** The field-type noun, already resolved by the overlay that owns the box. */
  label: string;
}) {
  const t = useTranslation();
  // Server-saved on a resumed session but not re-fetched into the client.
  if (!value) {
    return (
      <span className="truncate px-2xs text-2xs font-semibold text-success">
        {t('signer.fieldDone')}
      </span>
    );
  }
  if (value.type === 'SIGNATURE') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL, not a remote asset
      <img
        src={value.dataUrl}
        alt={t('signer.fieldValueAlt', { label })}
        className="h-full w-full object-contain"
      />
    );
  }
  const fontFamily = value.type === 'TEXT' ? value.fontFamily : undefined;
  return (
    <span
      className="truncate px-2xs text-sm leading-none text-foreground"
      style={fontFamily ? { fontFamily } : undefined}
    >
      {value.text}
    </span>
  );
}
