import type { DocumentSummary } from './documents';
import {
  contractMetaLine,
  kanbanBoardCopy,
  nextActionCopy,
  pendingSignerLabel,
  relativeTime,
  summaryCopy,
  urgencyLabel,
  viewSwitcherCopy,
} from './todo-copy';
import { onboardingCopy } from './onboarding-copy';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslate,
} from './web-translations';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locale';

/** Matches any Hangul syllable, the marker of copy that never got translated. */
const HANGUL = /[가-힣]/;

/**
 * An isolated runtime per test keeps the shared browser report clean and lets a
 * test assert exactly which keys the dashboard failed to resolve.
 */
function translatorFor(locale: SupportedLocale) {
  const runtime = createWebTranslationRuntime();
  const t: WebTranslate = (key, params) => runtime.translate(locale, key, params);
  return { t, runtime };
}

function documentFixture(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: 'doc-1',
    title: 'Service agreement',
    status: 'IN_PROGRESS',
    statusLabel: 'In progress',
    recipientCount: 2,
    pendingSignerCount: 1,
    pageCount: 3,
    urgency: 'NORMAL',
    nextAction: 'AWAITING_SIGN',
    createdAt: '2026-08-20T00:00:00.000Z',
    sentAt: '2026-08-20T00:00:00.000Z',
    completedAt: null,
    downloadsReady: false,
    ...overrides,
  } as DocumentSummary;
}

/** Every string the dashboard's copy bindings can produce, for one locale. */
function renderAllCopy(t: WebTranslate): string[] {
  const summary = summaryCopy(t);
  const board = kanbanBoardCopy(t);
  const switcher = viewSwitcherCopy(t);
  const onboarding = onboardingCopy(t);
  const now = Date.parse('2026-08-27T00:00:00.000Z');

  return [
    urgencyLabel(t, 'OVERDUE'),
    urgencyLabel(t, 'DUE_SOON'),
    ...(['SEND_DRAFT', 'AWAITING_SIGN', 'DOWNLOAD'] as const).map(
      (action) => nextActionCopy(t, action)?.label ?? '',
    ),
    pendingSignerLabel(t, 4) ?? '',
    contractMetaLine(t, documentFixture(), now),
    contractMetaLine(t, documentFixture({ status: 'DRAFT', sentAt: null }), now),
    relativeTime(t, '2026-08-26T23:59:59.000Z', now),
    relativeTime(t, '2026-08-26T23:30:00.000Z', now),
    relativeTime(t, '2026-08-26T00:00:00.000Z', now),
    relativeTime(t, '2026-08-24T00:00:00.000Z', now),
    ...Object.values(summary.title),
    summary.srLabel('OVERDUE', 3),
    ...Object.values(board.columnLabel),
    board.srLabel('DRAFT', 2),
    board.emptyColumn,
    board.boardLabel,
    ...Object.values(switcher.label),
    switcher.groupLabel,
    onboarding.title,
    onboarding.description,
    ...onboarding.steps.flatMap((step) => [step.title, step.description]),
    onboarding.cta,
  ];
}

describe('dashboard copy bindings resolve from the catalog', () => {
  it.each([...SUPPORTED_LOCALES])('renders every dashboard string in %s', (locale) => {
    const { t, runtime } = translatorFor(locale);

    const rendered = renderAllCopy(t);

    // A key the catalog is missing would surface as Korean fallback copy or the
    // last-resort placeholder, so the report is the assertion that matters.
    expect(runtime.getFallbackReport().entries).toEqual([]);
    expect(rendered).not.toContain(UNKNOWN_WEB_TRANSLATION_FALLBACK);
    expect(rendered.filter((value) => value.trim() === '')).toEqual([]);
    // An unsupplied slot stays a literal `{name}` — a defect the reader would see.
    expect(rendered.filter((value) => value.includes('{'))).toEqual([]);
  });

  it('leaves no Korean in the English dashboard', () => {
    const { t } = translatorFor('en');

    expect(renderAllCopy(t).filter((value) => HANGUL.test(value))).toEqual([]);
  });

  it('keeps the Korean wording the dashboard shipped with', () => {
    const { t } = translatorFor('ko');
    const summary = summaryCopy(t);

    expect(urgencyLabel(t, 'OVERDUE')).toBe('기한 초과');
    expect(nextActionCopy(t, 'SEND_DRAFT')).toEqual({ label: '발송하기', kind: 'cta' });
    expect(summary.title.AWAITING).toBe('서명 대기 중');
    expect(summary.srLabel('OVERDUE', 3)).toBe('기한 초과 3건');
    expect(kanbanBoardCopy(t).srLabel('DRAFT', 2)).toBe('작성 중 2건');
    expect(viewSwitcherCopy(t).label.kanban).toBe('칸반');
  });
});

describe('urgency and next-action copy', () => {
  it('renders no urgency label for a contract under no time pressure', () => {
    const { t } = translatorFor('en');

    expect(urgencyLabel(t, 'NORMAL')).toBe('');
  });

  it('invents no next action for a contract that has none', () => {
    const { t } = translatorFor('en');

    expect(nextActionCopy(t, null)).toBeNull();
  });

  it('marks awaiting-signature as a passive status, not a call to action', () => {
    const { t } = translatorFor('en');

    expect(nextActionCopy(t, 'AWAITING_SIGN')?.kind).toBe('status');
    expect(nextActionCopy(t, 'DOWNLOAD')?.kind).toBe('cta');
  });

  it('omits the pending-signer segment when nobody is awaited', () => {
    const { t } = translatorFor('en');

    expect(pendingSignerLabel(t, 0)).toBeNull();
    expect(pendingSignerLabel(t, 2)).toBe('Awaiting signature: 2');
  });
});

describe('relative timestamps', () => {
  const now = Date.parse('2026-08-27T12:00:00.000Z');

  it.each([
    ['2026-08-27T11:59:30.000Z', 'just now'],
    ['2026-08-27T11:15:00.000Z', '45m ago'],
    ['2026-08-27T06:00:00.000Z', '6h ago'],
    ['2026-08-24T12:00:00.000Z', '3d ago'],
  ])('renders %s as %s', (iso, expected) => {
    const { t } = translatorFor('en');

    expect(relativeTime(t, iso, now)).toBe(expected);
  });

  it('falls back to a numeric date beyond a week, identical in both locales', () => {
    const iso = '2026-08-03T12:00:00.000Z';

    const korean = relativeTime(translatorFor('ko').t, iso, now);
    const english = relativeTime(translatorFor('en').t, iso, now);

    expect(english).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(korean).toBe(english);
  });

  it('renders nothing for an unparseable timestamp instead of guessing', () => {
    const { t } = translatorFor('en');

    expect(relativeTime(t, 'not-a-date', now)).toBe('');
  });
});

describe('contract meta line', () => {
  const now = Date.parse('2026-08-27T12:00:00.000Z');

  it('joins the populated segments and drops the empty ones', () => {
    const { t } = translatorFor('en');

    const line = contractMetaLine(
      t,
      documentFixture({
        recipientCount: 2,
        pendingSignerCount: 0,
        pageCount: 3,
        sentAt: '2026-08-27T11:00:00.000Z',
      }),
      now,
    );

    expect(line).toBe('Recipients: 2 · Pages: 3 · Sent 1h ago');
  });

  it('dates a draft by when it was created, since it was never sent', () => {
    const { t } = translatorFor('en');

    const line = contractMetaLine(
      t,
      documentFixture({
        status: 'DRAFT',
        recipientCount: 0,
        pendingSignerCount: 0,
        pageCount: 0,
        sentAt: null,
        createdAt: '2026-08-27T09:00:00.000Z',
      }),
      now,
    );

    expect(line).toBe('Created 3h ago');
  });
});
