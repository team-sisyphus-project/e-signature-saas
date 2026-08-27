/**
 * TO-DO dashboard copy — the single source of truth for the user-facing strings
 * that turn the contract list into a work queue (urgency labels, next-action
 * copy, the pending-signer line, and the summary-card titles).
 *
 * Source of truth: design-spec/messaging/todo-copy.md, which extends the project
 * base voice (design-spec/messaging/recording.md): no blame, always give
 * the next action, and stay calm (never manufacture urgency/countdowns). Per base
 * voice principle 6, every user-facing string lives in one place (`lib/*-copy.ts`)
 * so it stays consistent and auditable — components take these as props and never
 * own the wording themselves.
 */

import type { NextAction, Urgency } from './documents';
import type { DashboardSummaryCopy } from '@/components/dashboard-summary';
import type { ViewSwitcherCopy } from '@/components/view-switcher';
import type { KanbanBoardCopy } from '@/components/kanban-board';

/**
 * Urgency labels — shared verbatim by the UrgencyBadge and the summary cards so
 * the same urgency reads with the same word across the dashboard
 * (todo-copy.md "Urgency labels"). NORMAL carries no label (no badge is rendered).
 */
const URGENCY_LABEL: Record<Exclude<Urgency, 'NORMAL'>, string> = {
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due soon',
};

/** The urgency label for a badge; empty for NORMAL (badge renders nothing then). */
export function urgencyLabel(urgency: Urgency): string {
  return urgency === 'NORMAL' ? '' : URGENCY_LABEL[urgency];
}

/**
 * NextAction copy (todo-copy.md "NextAction button/label copy"). `cta` actions are
 * value-carrying verb phrases (the primary next step); `status` is a passive
 * state label with no owner action to take right now — we do NOT invent a
 * "remind/nudge" action for it (automated reminders are out of PLAN scope).
 * `CANCELLED` maps to `null` (no next action) — no fake CTA is manufactured.
 */
export type NextActionKind = 'cta' | 'status';

export interface NextActionCopy {
  label: string;
  kind: NextActionKind;
}

const NEXT_ACTION_COPY: Record<NextAction, NextActionCopy> = {
  SEND_DRAFT: { label: 'Send', kind: 'cta' },
  AWAITING_SIGN: { label: 'Awaiting signatures', kind: 'status' },
  DOWNLOAD: { label: 'Download', kind: 'cta' },
};

/** The card's next-action copy, or `null` when there is none (CANCELLED). */
export function nextActionCopy(action: NextAction | null): NextActionCopy | null {
  return action ? NEXT_ACTION_COPY[action] : null;
}

/**
 * Pending-signer line (todo-copy.md "pendingSignerCount copy"): the short
 * form `{N} awaiting signature`, aligned with the existing recipient-count meta
 * wording. `null` at 0 so the caller omits the line entirely (no "0 awaiting"
 * noise).
 */
export function pendingSignerLabel(count: number): string | null {
  return count > 0 ? `${count} awaiting signature` : null;
}

/**
 * Summary-card titles + count unit (todo-copy.md "summary card copy"). Titles
 * reuse the urgency vocabulary (Overdue / Due soon) plus "Awaiting signatures"
 * (the IN_PROGRESS superset); the count unit stays empty in English (the bare
 * number reads naturally, unlike the Korean counter word).
 */
export const SUMMARY_COPY: DashboardSummaryCopy = {
  title: {
    OVERDUE: 'Overdue',
    DUE_SOON: 'Due soon',
    AWAITING: 'Awaiting signatures',
  },
  countUnit: '',
};

/**
 * Shown when a summary-card filter is active but no contract matches it (e.g. a
 * 0-count card is selected). Base voice: state it calmly and give the next action
 * (clear the filter) — not "no contracts yet", which would be wrong when
 * contracts exist but none match the current filter.
 */
export const FILTERED_EMPTY_COPY = {
  message: 'No contracts match this filter.',
  clear: 'View all',
};

/**
 * View switcher labels (todo-copy.md "view switcher labels"). The dashboard shows
 * its contracts as a TO-DO list or a kanban board; the ViewSwitcher takes
 * these as props so it never owns the wording. `groupLabel` names the control for
 * screen readers. Plain nouns, aligned with the calm base voice — no verbs/urgency.
 */
export const VIEW_SWITCHER_COPY: ViewSwitcherCopy = {
  label: {
    list: 'List',
    kanban: 'Kanban',
  },
  groupLabel: 'Switch view',
};

/**
 * Kanban board copy (todo-copy.md "kanban column labels"). Column headers reuse
 * the project's established status vocabulary — Draft / In progress / Completed /
 * Cancelled, the same words as the server's DOCUMENT_STATUS_LABEL and the
 * StatusBadge — so a status reads with the same word on every screen (base voice:
 * never say a state differently per screen). `countUnit` matches the summary
 * cards; the empty-column line states calmly that the column has nothing, giving
 * no false urgency.
 */
export const KANBAN_BOARD_COPY: KanbanBoardCopy = {
  columnLabel: {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  },
  countUnit: '',
  emptyColumn: 'No contracts in this state.',
  boardLabel: 'Kanban board',
};
