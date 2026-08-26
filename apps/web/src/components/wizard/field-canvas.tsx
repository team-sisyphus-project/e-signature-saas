'use client';

/**
 * The interactive PDF page + field overlay (desktop placement surface).
 *
 * Renders one page of the open document into a raster `<canvas>` (pointer-inert)
 * and lays an absolutely-positioned overlay of exactly the rendered CSS size on
 * top. Fields are positioned from their normalized model via `normToPx`, so they
 * track the page through zoom and page changes; on every commit they are
 * converted back with `pxToNorm` + clamped, keeping the stored geometry valid
 * and round-trip-stable.
 *
 * Interactions:
 *   • place — drop a palette tool (HTML5 DnD) onto the page, centered at cursor
 *   • move  — pointer-drag a field body (pointer capture, snap guides)
 *   • resize— pointer-drag any of 8 handles
 *   • select/hover — click / pointer-enter, with clear visual feedback
 *   • keyboard — focus a field, arrows move, Shift+arrows resize, Delete removes
 */

import * as React from 'react';
import { cn } from '@repo/ui';
import {
  openPdf,
  renderPageToCanvas,
  isRenderCancelled,
  PdfRenderError,
  type PdfDocument,
} from '@/lib/pdf';
import {
  normToPx,
  pxToNorm,
  clampPxRect,
  clampNormRect,
  defaultPxRectAt,
  resizePxRect,
  snapMove,
  FIELD_TYPE_META,
  RESIZE_HANDLES,
  type PageSize,
  type PxRect,
  type SignFieldType,
  type ResizeHandle,
  type SnapLine,
} from '@/lib/field-geometry';
import type { SignFieldDraft } from './wizard-context';
import {
  clearSelection,
  deleteSelectedFields,
  fieldIdsInMarquee,
  moveSelectedFields,
  selectionAfterClick,
} from './field-canvas-selection';

const SNAP_THRESHOLD = 6; // px
const NUDGE_PX = 1;
const NUDGE_PX_LARGE = 12;
/** dataTransfer key carrying the field type during a palette → canvas drag. */
export const FIELD_DND_TYPE = 'application/x-esign-field';

type RenderStatus = 'loading' | 'ready' | 'error';

interface FieldCanvasProps {
  file: File;
  page: number;
  zoom: number;
  /** Available width (px) the page fits into at zoom 1. */
  fitWidth: number;
  fields: SignFieldDraft[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  /** Replace the full field list (single source lives in wizard state). */
  onFieldsChange: (fields: SignFieldDraft[]) => void;
  /** Report rendered page count once the document opens. */
  onPageCount?: (count: number) => void;
  className?: string;
}

let fieldSeq = 0;
/** Monotonic, collision-resistant id for a newly placed field. */
export function nextFieldId(): string {
  fieldSeq += 1;
  return `field-${fieldSeq}-${Math.round(performance.now())}`;
}

/** Active pointer gesture transient state (px space, current page). */
type Gesture =
  | {
      kind: 'move';
      id: string;
      items: { id: string; startRect: PxRect }[];
      startX: number;
      startY: number;
    }
  | {
      kind: 'resize';
      id: string;
      handle: ResizeHandle;
      startRect: PxRect;
      startX: number;
      startY: number;
    };

export function FieldCanvas({
  file,
  page,
  zoom,
  fitWidth,
  fields,
  selectedIds,
  onSelect,
  onFieldsChange,
  onPageCount,
  className,
}: FieldCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const docRef = React.useRef<PdfDocument | null>(null);

  const [status, setStatus] = React.useState<RenderStatus>('loading');
  const [docReady, setDocReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageSize, setPageSize] = React.useState<PageSize>({ width: fitWidth, height: fitWidth * 1.414 });
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  // Live gesture rect + guides, kept local so dragging re-renders cheaply.
  const [liveRects, setLiveRects] = React.useState<{ id: string; rect: PxRect }[]>([]);
  const [guides, setGuides] = React.useState<SnapLine[]>([]);
  const gestureRef = React.useRef<Gesture | null>(null);
  const marqueeRef = React.useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [marquee, setMarquee] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const onPageCountRef = React.useRef(onPageCount);
  React.useEffect(() => {
    onPageCountRef.current = onPageCount;
  }, [onPageCount]);

  // Open the document once; dispose on unmount. `docReady` gates the render
  // effect so the first page draws as soon as the handle is available.
  React.useEffect(() => {
    let disposed = false;
    setStatus('loading');
    setDocReady(false);
    openPdf(file)
      .then(({ doc, pageCount }) => {
        if (disposed) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        onPageCountRef.current?.(pageCount);
        setDocReady(true);
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });
    return () => {
      disposed = true;
      setDocReady(false);
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [file]);

  const cssWidth = Math.round(fitWidth * zoom);

  // Render the current page whenever it, the zoom, or the open document changes.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const doc = docRef.current;
    if (!canvas || !docReady || !doc) return;
    let cancelled = false;

    const run = async () => {
      setStatus('loading');
      try {
        const { cssWidth: w, cssHeight: h } = await renderPageToCanvas(doc, page, canvas, cssWidth);
        if (cancelled) return;
        setPageSize({ width: w, height: h });
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (cancelled || isRenderCancelled(err)) return;
        setError(
          err instanceof PdfRenderError
            ? err.message
            : 'PDF를 읽을 수 없어요. 파일이 손상되지 않았는지 확인해 주세요.',
        );
        setStatus('error');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [docReady, page, cssWidth]);

  const pageFields = React.useMemo(() => fields.filter((f) => f.page === page), [fields, page]);

  const updateField = React.useCallback(
    (id: string, patch: Partial<SignFieldDraft>) => {
      onFieldsChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    [fields, onFieldsChange],
  );

  const removeField = React.useCallback(
    (id: string) => {
      onFieldsChange(fields.filter((f) => f.id !== id));
      if (selectedIds.includes(id)) onSelect(selectedIds.filter((selectedId) => selectedId !== id));
    },
    [fields, onFieldsChange, selectedIds, onSelect],
  );

  const removeSelected = React.useCallback(() => {
    if (!selectedIds.length) return;
    onFieldsChange(deleteSelectedFields(fields, selectedIds));
    onSelect([]);
  }, [fields, onFieldsChange, onSelect, selectedIds]);

  // --- placement (HTML5 drag-and-drop from the palette) --------------------

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(FIELD_DND_TYPE) as SignFieldType;
      if (!type || !FIELD_TYPE_META[type]) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const center = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const px = defaultPxRectAt(type, center, pageSize);
      const norm = clampNormRect(pxToNorm(px, pageSize));
      const id = nextFieldId();
      onFieldsChange([...fields, { id, type, page, ...norm }]);
      onSelect([id]);
    },
    [fields, onFieldsChange, onSelect, page, pageSize],
  );

  // --- move / resize (pointer events with capture) -------------------------

  const peerRectsForSelection = React.useCallback(
    (items: { id: string }[]): PxRect[] => {
      const selected = new Set(items.map((item) => item.id));
      return pageFields.filter((f) => !selected.has(f.id)).map((f) => normToPx(f, pageSize));
    },
    [pageFields, pageSize],
  );

  const onGesturePointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;

      if (g.kind === 'move') {
        const bounds = g.items.reduce(
          (acc, item) => ({
            left: Math.min(acc.left, item.startRect.left),
            top: Math.min(acc.top, item.startRect.top),
            right: Math.max(acc.right, item.startRect.left + item.startRect.width),
            bottom: Math.max(acc.bottom, item.startRect.top + item.startRect.height),
          }),
          { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        );
        const groupDx = Math.max(-bounds.left, Math.min(pageSize.width - bounds.right, dx));
        const groupDy = Math.max(-bounds.top, Math.min(pageSize.height - bounds.bottom, dy));
        const anchor = g.items.find((item) => item.id === g.id) ?? g.items[0];
        if (!anchor) return;
        const anchorRect = clampPxRect(
          { ...anchor.startRect, left: anchor.startRect.left + groupDx, top: anchor.startRect.top + groupDy },
          pageSize,
        );
        const snapped = snapMove(anchorRect, pageSize, peerRectsForSelection(g.items), SNAP_THRESHOLD);
        const snapDx = snapped.rect.left - anchor.startRect.left;
        const snapDy = snapped.rect.top - anchor.startRect.top;
        const finalDx = Math.max(-bounds.left, Math.min(pageSize.width - bounds.right, snapDx));
        const finalDy = Math.max(-bounds.top, Math.min(pageSize.height - bounds.bottom, snapDy));
        setGuides(snapped.guides);
        setLiveRects(
          g.items.map((item) => ({
            id: item.id,
            rect: clampPxRect(
              { ...item.startRect, left: item.startRect.left + finalDx, top: item.startRect.top + finalDy },
              pageSize,
            ),
          })),
        );
      } else {
        const resized = clampPxRect(resizePxRect(g.startRect, g.handle, dx, dy), pageSize);
        setLiveRects([{ id: g.id, rect: resized }]);
        setGuides([]);
      }
    },
    [pageSize, peerRectsForSelection],
  );

  const endGesture = React.useCallback(
    (event: React.PointerEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const live = liveRects;
      gestureRef.current = null;
      setGuides([]);
      setLiveRects([]);
      try {
        (event.target as Element).releasePointerCapture?.(event.pointerId);
      } catch {
        /* capture may already be gone */
      }
      if (live.length) {
        const liveById = new Map(live.map((item) => [item.id, item.rect]));
        onFieldsChange(
          fields.map((field) => {
            const rect = liveById.get(field.id);
            return rect ? { ...field, ...clampNormRect(pxToNorm(rect, pageSize)) } : field;
          }),
        );
      }
    },
    [fields, liveRects, onFieldsChange, pageSize],
  );

  const selectField = React.useCallback(
    (id: string, event: React.PointerEvent): string[] => {
      return selectionAfterClick(selectedIds, id, event);
    },
    [selectedIds],
  );

  const startMove = React.useCallback(
    (event: React.PointerEvent, field: SignFieldDraft) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      // Keep a multi-selection intact when starting a drag from one of its
      // members. A modifier click still toggles membership as usual.
      const hasModifier = event.shiftKey || event.metaKey || event.ctrlKey;
      const nextSelection =
        !hasModifier && selectedIds.includes(field.id) && selectedIds.length > 1
          ? selectedIds
          : selectField(field.id, event);
      onSelect(nextSelection);
      // A modifier-click on an already selected field removes it; it should
      // not also start a drag gesture for the field that was just removed.
      if (!nextSelection.includes(field.id)) {
        gestureRef.current = null;
        setLiveRects([]);
        return;
      }
      const selectedOnPage = new Set(nextSelection);
      const items = pageFields
        .filter((candidate) => selectedOnPage.has(candidate.id))
        .map((candidate) => ({ id: candidate.id, startRect: normToPx(candidate, pageSize) }));
      gestureRef.current = { kind: 'move', id: field.id, items, startX: event.clientX, startY: event.clientY };
      setLiveRects(items.map((item) => ({ id: item.id, rect: item.startRect })));
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    },
    [onSelect, pageFields, pageSize, selectField, selectedIds],
  );

  const startResize = React.useCallback(
    (event: React.PointerEvent, field: SignFieldDraft, handle: ResizeHandle) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      onSelect(selectField(field.id, event));
      const startRect = normToPx(field, pageSize);
      gestureRef.current = {
        kind: 'resize',
        id: field.id,
        handle,
        startRect,
        startX: event.clientX,
        startY: event.clientY,
      };
      setLiveRects([{ id: field.id, rect: startRect }]);
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    },
    [onSelect, pageSize, selectField],
  );

  // --- keyboard assist (move / resize / delete a focused field) ------------

  const onFieldKeyDown = React.useCallback(
    (event: React.KeyboardEvent, field: SignFieldDraft) => {
      const step = event.shiftKey ? NUDGE_PX_LARGE : NUDGE_PX;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeSelected();
        return;
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = arrows[event.key];
      if (!delta) return;
      event.preventDefault();
      const base = normToPx(field, pageSize);
      let next: PxRect;
      if (event.shiftKey) {
        // Shift = resize the bottom-right corner.
        next = resizePxRect(base, 'se', delta[0], delta[1]);
      } else {
        next = { ...base, left: base.left + delta[0], top: base.top + delta[1] };
      }
      const selected = selectedIds.includes(field.id) ? selectedIds : [field.id];
      const dx = delta[0];
      const dy = delta[1];
      if (!event.shiftKey && selected.length > 1) {
        onFieldsChange(moveSelectedFields(fields, selected, dx, dy, pageSize));
      } else {
        updateField(field.id, clampNormRect(pxToNorm(clampPxRect(next, pageSize), pageSize)));
      }
    },
    [fields, onFieldsChange, pageSize, removeSelected, selectedIds, updateField],
  );

  React.useEffect(() => {
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSelect(clearSelection());
    };
    window.addEventListener('keydown', clearOnEscape);
    return () => window.removeEventListener('keydown', clearOnEscape);
  }, [onSelect]);

  const startMarquee = React.useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const bounds = overlay.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    marqueeRef.current = { startX: x, startY: y, x, y };
    setMarquee(null);
    overlay.setPointerCapture?.(event.pointerId);
  }, []);

  const onMarqueePointerMove = React.useCallback((event: React.PointerEvent) => {
    const start = marqueeRef.current;
    const overlay = overlayRef.current;
    if (!start || !overlay) return;
    const bounds = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(pageSize.width, event.clientX - bounds.left));
    const y = Math.max(0, Math.min(pageSize.height, event.clientY - bounds.top));
    marqueeRef.current = { ...start, x, y };
    const next = { left: Math.min(start.startX, x), top: Math.min(start.startY, y), width: Math.abs(x - start.startX), height: Math.abs(y - start.startY) };
    setMarquee(next);
  }, [pageSize]);

  const endMarquee = React.useCallback((event: React.PointerEvent) => {
    const start = marqueeRef.current;
    const overlay = overlayRef.current;
    if (!start || !overlay) return;
    const bounds = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(pageSize.width, event.clientX - bounds.left));
    const y = Math.max(0, Math.min(pageSize.height, event.clientY - bounds.top));
    const area = { left: Math.min(start.startX, x), top: Math.min(start.startY, y), right: Math.max(start.startX, x), bottom: Math.max(start.startY, y) };
    const dragged = Math.abs(x - start.startX) > 3 || Math.abs(y - start.startY) > 3;
    marqueeRef.current = null;
    setMarquee(null);
    try { overlay.releasePointerCapture?.(event.pointerId); } catch { /* capture may already be gone */ }
    if (dragged) {
      const intersecting = fieldIdsInMarquee(pageFields, page, pageSize, {
        left: area.left,
        top: area.top,
        width: area.right - area.left,
        height: area.bottom - area.top,
      });
      onSelect(intersecting);
    } else {
      onSelect(clearSelection());
    }
  }, [onSelect, page, pageFields, pageSize]);

  const rectFor = (field: SignFieldDraft): PxRect =>
    liveRects.find((item) => item.id === field.id)?.rect ?? normToPx(field, pageSize);

  return (
    <div className={cn('relative w-full overflow-auto', className)}>
      <div
        className="relative mx-auto"
        style={{ width: pageSize.width, height: pageSize.height }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`계약 PDF ${page}페이지`}
          className="pointer-events-none absolute inset-0 rounded-sm border border-border bg-surface shadow-sm"
        />

        {status === 'loading' ? (
          <div
            aria-hidden="true"
            className="skeleton-shimmer absolute inset-0 animate-shimmer rounded-sm"
          />
        ) : null}

        {status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-xs rounded-sm border border-border bg-surface-muted px-md text-center">
            <p className="text-sm text-foreground-muted">{error}</p>
          </div>
        ) : null}

        {/* Field overlay — receives drops + clears selection on empty click. */}
        <div
          ref={overlayRef}
          className="absolute inset-0"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={onDrop}
          onPointerDown={startMarquee}
          onPointerMove={onMarqueePointerMove}
          onPointerUp={endMarquee}
        >
          {/* Snap guides */}
          {guides.map((g, i) =>
            g.axis === 'x' ? (
              <span
                key={`gx-${i}`}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/70"
                style={{ left: g.pos }}
              />
            ) : (
              <span
                key={`gy-${i}`}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 h-px bg-primary/70"
                style={{ top: g.pos }}
              />
            ),
          )}

          {marquee ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute border border-primary bg-primary/10"
              style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
            />
          ) : null}

          {pageFields.map((field) => {
            const rect = rectFor(field);
            const selected = selectedIds.includes(field.id);
            const hovered = hoverId === field.id;
            const dragging = liveRects.some((item) => item.id === field.id);
            return (
              <FieldBox
                key={field.id}
                field={field}
                rect={rect}
                selected={selected}
                hovered={hovered}
                dragging={dragging}
                onPointerEnter={() => setHoverId(field.id)}
                onPointerLeave={() => setHoverId((h) => (h === field.id ? null : h))}
                onPointerDownBody={(e) => startMove(e, field)}
                onPointerDownHandle={(e, h) => startResize(e, field, h)}
                onPointerMove={onGesturePointerMove}
                onPointerUp={endGesture}
                onKeyDown={(e) => onFieldKeyDown(e, field)}
                onDelete={() => (selectedIds.length > 1 ? removeSelected() : removeField(field.id))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FieldBoxProps {
  field: SignFieldDraft;
  rect: PxRect;
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerDownBody: (e: React.PointerEvent) => void;
  onPointerDownHandle: (e: React.PointerEvent, handle: ResizeHandle) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDelete: () => void;
}

function FieldBox({
  field,
  rect,
  selected,
  hovered,
  dragging,
  onPointerEnter,
  onPointerLeave,
  onPointerDownBody,
  onPointerDownHandle,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  onDelete,
}: FieldBoxProps) {
  const meta = FIELD_TYPE_META[field.type];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${meta.label} 필드. 방향키로 이동, Shift+방향키로 크기 조절, Delete로 삭제`}
      aria-pressed={selected}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDownBody}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onFocus={onPointerEnter}
      onBlur={onPointerLeave}
      className={cn(
        'group absolute flex select-none items-center justify-center rounded-sm border-2 text-xs font-semibold',
        'outline-none transition-[box-shadow,background-color,border-color]',
        dragging ? 'cursor-grabbing duration-0' : 'cursor-grab duration-fast ease-standard',
        selected
          ? 'border-primary bg-primary-subtle/80 text-primary shadow-md ring-2 ring-focus'
          : hovered
            ? 'border-primary bg-primary-subtle/60 text-primary shadow-sm'
            : 'border-dashed border-primary/60 bg-primary-subtle/40 text-primary/90',
      )}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <span className="pointer-events-none flex items-center gap-2xs truncate px-2xs">
        <FieldGlyph type={field.type} />
        {meta.label}
      </span>

      {/* Delete affordance — appears when the field is active. */}
      {selected ? (
        <button
          type="button"
          aria-label={`${meta.label} 필드 삭제`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm transition-transform duration-fast hover:scale-110 active:scale-95"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      {/* Resize handles — visible on select/hover. */}
      {selected || hovered
        ? RESIZE_HANDLES.map((h) => (
            <span
              key={h}
              onPointerDown={(e) => onPointerDownHandle(e, h)}
              className={cn(
                'absolute h-2.5 w-2.5 rounded-full border border-primary bg-surface shadow-xs',
                HANDLE_POSITION[h],
                HANDLE_CURSOR[h],
              )}
            />
          ))
        : null}
    </div>
  );
}

const HANDLE_POSITION: Record<ResizeHandle, string> = {
  nw: '-left-1.5 -top-1.5',
  n: 'left-1/2 -top-1.5 -translate-x-1/2',
  ne: '-right-1.5 -top-1.5',
  e: '-right-1.5 top-1/2 -translate-y-1/2',
  se: '-right-1.5 -bottom-1.5',
  s: 'left-1/2 -bottom-1.5 -translate-x-1/2',
  sw: '-left-1.5 -bottom-1.5',
  w: '-left-1.5 top-1/2 -translate-y-1/2',
};

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'cursor-nwse-resize',
  n: 'cursor-ns-resize',
  ne: 'cursor-nesw-resize',
  e: 'cursor-ew-resize',
  se: 'cursor-nwse-resize',
  s: 'cursor-ns-resize',
  sw: 'cursor-nesw-resize',
  w: 'cursor-ew-resize',
};

function FieldGlyph({ type }: { type: SignFieldType }) {
  if (type === 'SIGNATURE') {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <path
          d="M2 12c2-1 3-7 5-7s1 5 3 5 2-3 4-3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === 'DATE') {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M4 4h8M8 4v8M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
