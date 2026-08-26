import {
  clampNormRect,
  normToPx,
  pxToNorm,
  type PageSize,
  type PxRect,
} from '@/lib/field-geometry';
import type { SignFieldDraft } from './wizard-context';

export interface SelectionModifiers {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}

export function clearSelection(): string[] {
  return [];
}

/** Apply the canvas click selection contract, including modifier toggling. */
export function selectionAfterClick(
  selectedIds: string[],
  id: string,
  modifiers: SelectionModifiers = {},
): string[] {
  const modified = Boolean(modifiers.shiftKey || modifiers.metaKey || modifiers.ctrlKey);
  if (!modified) return [id];
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}

/** Rectangle intersection used by the canvas marquee (touching edges counts). */
export function rectsIntersect(a: PxRect, b: PxRect): boolean {
  return (
    a.left <= b.left + b.width &&
    a.left + a.width >= b.left &&
    a.top <= b.top + b.height &&
    a.top + a.height >= b.top
  );
}

export function fieldIdsInMarquee(
  fields: SignFieldDraft[],
  page: number,
  pageSize: PageSize,
  marquee: PxRect,
): string[] {
  return fields
    .filter((field) => field.page === page && rectsIntersect(normToPx(field, pageSize), marquee))
    .map((field) => field.id);
}

/** Move every selected field by one shared pixel delta, clamped to the page. */
export function moveSelectedFields(
  fields: SignFieldDraft[],
  selectedIds: string[],
  dx: number,
  dy: number,
  pageSize: PageSize,
): SignFieldDraft[] {
  const selected = new Set(selectedIds);
  const rects = fields
    .filter((field) => selected.has(field.id))
    .map((field) => ({ field, rect: normToPx(field, pageSize) }));
  if (!rects.length) return fields;
  const left = Math.min(...rects.map(({ rect }) => rect.left));
  const top = Math.min(...rects.map(({ rect }) => rect.top));
  const right = Math.max(...rects.map(({ rect }) => rect.left + rect.width));
  const bottom = Math.max(...rects.map(({ rect }) => rect.top + rect.height));
  const moveX = Math.max(-left, Math.min(pageSize.width - right, dx));
  const moveY = Math.max(-top, Math.min(pageSize.height - bottom, dy));

  return fields.map((field) => {
    const item = rects.find(({ field: selectedField }) => selectedField.id === field.id);
    if (!item) return field;
    return {
      ...field,
      ...clampNormRect(
        pxToNorm({ ...item.rect, left: item.rect.left + moveX, top: item.rect.top + moveY }, pageSize),
      ),
    };
  });
}

export function deleteSelectedFields(fields: SignFieldDraft[], selectedIds: string[]): SignFieldDraft[] {
  const selected = new Set(selectedIds);
  return fields.filter((field) => !selected.has(field.id));
}
