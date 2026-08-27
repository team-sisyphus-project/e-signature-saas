/**
 * TO-DO dashboard copy bindings — the layer that turns `dashboard.*` catalog
 * keys into the copy shapes the dashboard's presentational components take as
 * props (urgency labels, next-action copy, the card meta line, and the summary,
 * view-switcher, and kanban payloads).
 *
 * The strings themselves live in `lib/i18n/dashboard.ts`; nothing here holds
 * wording. That split is what keeps two rules true at once: components never own
 * user-facing text, and no user-facing text exists outside the translation
 * catalog. Every function is pure and takes the locale-bound translator, so both
 * locales are verifiable without rendering a component.
 *
 * Voice (unchanged by the move): calm, no blame, always offer the next action,
 * and never manufacture urgency.
 */

import type { DocumentSummary, NextAction, Urgency } from './documents';
import type { WebTranslate, WebTranslationKey } from './web-translations';
import type { DashboardSummaryCopy, SummaryFilterKey } from '@/components/dashboard-summary';
import type { ViewSwitcherCopy } from '@/components/view-switcher';
import type { KanbanBoardCopy } from '@/components/kanban-board';

/**
 * Urgency labels, shared verbatim by the UrgencyBadge and the summary cards so
 * the same urgency reads with the same word across the dashboard. NORMAL
 * carries no label — no badge is rendered for it.
 */
const URGENCY_KEY: Record<Exclude<Urgency, 'NORMAL'>, WebTranslationKey> = {
  OVERDUE: 'dashboard.urgencyOverdue',
  DUE_SOON: 'dashboard.urgencyDueSoon',
};

/** The urgency label for a badge; empty for NORMAL (badge renders nothing then). */
export function urgencyLabel(t: WebTranslate, urgency: Urgency): string {
  return urgency === 'NORMAL' ? '' : t(URGENCY_KEY[urgency]);
}

/**
 * NextAction copy. `cta` actions are value-carrying verb phrases (the primary
 * next step); `status` is a passive state label with no owner action to take
 * right now — we do NOT invent a "remind/nudge" action for it (automated
 * reminders are out of scope). `CANCELLED` maps to `null` (no next action) — no
 * fake CTA is manufactured.
 */
export type NextActionKind = 'cta' | 'status';

export interface NextActionCopy {
  label: string;
  kind: NextActionKind;
}

const NEXT_ACTION: Record<NextAction, { key: WebTranslationKey; kind: NextActionKind }> = {
  SEND_DRAFT: { key: 'dashboard.actionSend', kind: 'cta' },
  AWAITING_SIGN: { key: 'dashboard.actionAwaiting', kind: 'status' },
  DOWNLOAD: { key: 'dashboard.actionDownload', kind: 'cta' },
};

/** The card's next-action copy, or `null` when there is none (CANCELLED). */
export function nextActionCopy(t: WebTranslate, action: NextAction | null): NextActionCopy | null {
  if (!action) return null;
  const entry = NEXT_ACTION[action];
  return { label: t(entry.key), kind: entry.kind };
}

/**
 * Pending-signer line. `null` at 0 so the caller omits the segment entirely,
 * rather than rendering a "0 awaiting" that carries no information.
 */
export function pendingSignerLabel(t: WebTranslate, count: number): string | null {
  return count > 0 ? t('dashboard.metaPendingSigners', { count }) : null;
}

/**
 * Relative timestamp for a card's meta line: "just now" under a minute, then
 * minutes, hours, and days, falling back to a plain numeric date after a week.
 *
 * The numeric date is deliberately not localized — spec excludes locale date
 * formatting, and `YYYY.MM.DD` is unambiguous in both locales. `now` is a
 * parameter so the boundaries are testable without freezing the clock.
 */
export function relativeTime(t: WebTranslate, iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor((now - then) / 60000);
  if (min < 1) return t('dashboard.timeJustNow');
  if (min < 60) return t('dashboard.timeMinutes', { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('dashboard.timeHours', { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t('dashboard.timeDays', { count: day });
  const date = new Date(then);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * The contract card's meta line: recipients, signers still awaited, page count,
 * and when it was sent (or created, while still a draft), joined with a middle
 * dot. Each segment is a whole catalog sentence — the joiner is punctuation, not
 * grammar, so no locale inherits another's word order.
 */
export function contractMetaLine(
  t: WebTranslate,
  document: DocumentSummary,
  now: number = Date.now(),
): string {
  const parts: string[] = [];
  if (document.recipientCount > 0) {
    parts.push(t('dashboard.metaRecipients', { count: document.recipientCount }));
  }
  const pending = pendingSignerLabel(t, document.pendingSignerCount);
  if (pending) parts.push(pending);
  if (document.pageCount > 0) parts.push(t('dashboard.metaPages', { count: document.pageCount }));

  const sent = document.status !== 'DRAFT' && document.sentAt;
  const when = relativeTime(t, sent ? (document.sentAt as string) : document.createdAt, now);
  parts.push(t(sent ? 'dashboard.metaSent' : 'dashboard.metaCreated', { when }));
  return parts.join(' · ');
}

/**
 * Accessible name for a counted group ("Overdue: 3"). One key serves both the
 * summary cards and the kanban columns because they read identically; the count
 * noun lives inside the catalog sentence, never concatenated at the call site.
 */
function countLabel(t: WebTranslate, label: string, count: number): string {
  return t('dashboard.countLabel', { label, count });
}

/**
 * Summary-card copy. Titles reuse the urgency vocabulary plus the
 * awaiting-signature label (the in-progress superset), so a summary card and a
 * document badge never say the same state with different words.
 */
export function summaryCopy(t: WebTranslate): DashboardSummaryCopy {
  const title: Record<SummaryFilterKey, string> = {
    OVERDUE: t('dashboard.urgencyOverdue'),
    DUE_SOON: t('dashboard.urgencyDueSoon'),
    AWAITING: t('dashboard.actionAwaiting'),
  };
  return {
    title,
    srLabel: (key, count) => countLabel(t, title[key], count),
  };
}

/**
 * View switcher labels. Plain nouns, aligned with the calm voice — no verbs, no
 * urgency. `groupLabel` names the control for screen readers.
 */
export function viewSwitcherCopy(t: WebTranslate): ViewSwitcherCopy {
  return {
    label: {
      list: t('dashboard.viewList'),
      kanban: t('dashboard.viewKanban'),
    },
    groupLabel: t('dashboard.viewSwitcherLabel'),
  };
}

/**
 * Kanban board copy. Column headers use the product's lifecycle vocabulary —
 * the same words the status badge shows — so a status reads the same on every
 * surface. The empty-column line states the absence calmly, with no false
 * urgency.
 */
export function kanbanBoardCopy(t: WebTranslate): KanbanBoardCopy {
  const columnLabel = {
    DRAFT: t('dashboard.statusDraft'),
    SCHEDULED: t('dashboard.statusScheduled'),
    IN_PROGRESS: t('dashboard.statusInProgress'),
    COMPLETED: t('dashboard.statusCompleted'),
    CANCELLED: t('dashboard.statusCancelled'),
  };
  return {
    columnLabel,
    srLabel: (status, count) => countLabel(t, columnLabel[status], count),
    emptyColumn: t('dashboard.kanbanEmptyColumn'),
    boardLabel: t('dashboard.kanbanBoardLabel'),
  };
}
