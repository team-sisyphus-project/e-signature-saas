/**
 * Templates screen bindings — the one piece of templates copy that is assembled
 * rather than simply rendered.
 *
 * Every fixed string the `/templates` screen shows now lives in the `templates`
 * domain of the browser catalog (`lib/i18n/templates.ts`) and is read straight
 * from `t()` at the render site. The per-card meta line is different: it joins
 * three independent facts whose presence depends on the template, so it lives
 * here where it can be unit-tested without mounting a card.
 */

import { relativeTime } from './todo-copy';
import type { WebTranslate } from './web-translations';

/** The subset of a template the meta line reads. `TemplateSummary` satisfies it. */
export interface TemplateMeta {
  pageCount: number;
  fieldCount: number;
  /** When the template was saved, as an ISO timestamp. */
  createdAt: string;
}

/**
 * A card's meta line: page count, placed-field count, and when it was saved,
 * joined with a middle dot.
 *
 * Each segment is a whole catalog sentence and the joiner is punctuation, not
 * grammar — so no locale inherits another's word order. A count of zero is
 * omitted rather than rendered, because "0 fields" carries no information a
 * sender acts on. `now` is a parameter so the time boundaries stay testable.
 */
export function templateMetaLine(
  t: WebTranslate,
  template: TemplateMeta,
  now: number = Date.now(),
): string {
  const parts: string[] = [];
  if (template.pageCount > 0) parts.push(t('templates.metaPages', { count: template.pageCount }));
  if (template.fieldCount > 0) {
    parts.push(t('templates.metaFields', { count: template.fieldCount }));
  }
  const when = relativeTime(t, template.createdAt, now);
  if (when) parts.push(t('templates.metaSaved', { when }));
  return parts.join(' · ');
}
