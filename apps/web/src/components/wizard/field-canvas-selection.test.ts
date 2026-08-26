import {
  clearSelection,
  deleteSelectedFields,
  fieldIdsInMarquee,
  moveSelectedFields,
  selectionAfterClick,
} from './field-canvas-selection';
import { normToPx, type PageSize } from '@/lib/field-geometry';
import type { SignFieldDraft } from './wizard-context';

const PAGE: PageSize = { width: 600, height: 800 };
const fields: SignFieldDraft[] = [
  { id: 'a', type: 'SIGNATURE', page: 1, x: 0.1, y: 0.7, width: 0.15, height: 0.05 },
  { id: 'b', type: 'DATE', page: 1, x: 0.5, y: 0.5, width: 0.15, height: 0.05 },
  { id: 'other-page', type: 'TEXT', page: 2, x: 0.1, y: 0.7, width: 0.15, height: 0.05 },
];

describe('FieldCanvas selection interactions', () => {
  it('selects one field normally and adds/removes with Shift or Cmd/Ctrl', () => {
    expect(selectionAfterClick([], 'a')).toEqual(['a']);
    expect(selectionAfterClick(['a'], 'b', { shiftKey: true })).toEqual(['a', 'b']);
    expect(selectionAfterClick(['a', 'b'], 'a', { metaKey: true })).toEqual(['b']);
    expect(selectionAfterClick(['b'], 'b', { ctrlKey: true })).toEqual([]);
  });

  it('selects every field intersecting a marquee and ignores other pages', () => {
    const a = normToPx(fields[0]!, PAGE);
    const b = normToPx(fields[1]!, PAGE);
    expect(fieldIdsInMarquee(fields, 1, PAGE, {
      left: a.left + a.width - 2,
      top: a.top + a.height - 2,
      width: 4,
      height: 4,
    })).toEqual(['a']);
    expect(fieldIdsInMarquee(fields, 1, PAGE, {
      left: b.left,
      top: b.top,
      width: b.width,
      height: b.height,
    })).toEqual(['b']);
  });

  it('moves the complete selection together and preserves relative positions', () => {
    const moved = moveSelectedFields(fields, ['a', 'b'], 30, -40, PAGE);
    expect(moved[0]!.x).toBeCloseTo(fields[0]!.x + 30 / PAGE.width);
    expect(moved[0]!.y).toBeCloseTo(fields[0]!.y + 40 / PAGE.height);
    expect(moved[1]!.x).toBeCloseTo(fields[1]!.x + 30 / PAGE.width);
    expect(moved[1]!.y).toBeCloseTo(fields[1]!.y + 40 / PAGE.height);
    expect(moved[2]!).toEqual(fields[2]);
  });

  it('deletes all selected fields together and supports clearing the selection', () => {
    expect(deleteSelectedFields(fields, ['a', 'b']).map((field) => field.id)).toEqual(['other-page']);
    expect(selectionAfterClick(['a', 'b'], 'a', { shiftKey: true })).toEqual(['b']);
    expect(selectionAfterClick(['b'], 'b', { shiftKey: true })).toEqual([]);
    expect(clearSelection()).toEqual([]);
  });
});
