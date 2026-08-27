import type { WebTranslationDomain } from './types';

/**
 * Sender dashboard copy: the contract list shell, the plan/quota card, the
 * empty and failure states, and everything the contract cards, summary cards,
 * kanban columns, view switcher, and first-run guide render.
 *
 * The dashboard owns one domain because it is one screen: a translator reads
 * this file top to bottom and sees every word the dashboard can show. Card and
 * board copy used to live in `lib/todo-copy.ts` / `lib/onboarding-copy.ts`;
 * those modules now only bind these keys to the copy props the presentational
 * components take, so no component owns wording and no wording is duplicated.
 *
 * Sentences with a value in them are one key with a `{slot}`, never a
 * concatenation of fragments — a fragment order that reads correctly in Korean
 * does not survive translation.
 */
export const DASHBOARD_TRANSLATIONS = {
  title: { ko: '계약', en: 'Contracts' },
  description: {
    ko: '보낸 계약의 진행 상황을 한눈에 확인하세요.',
    en: 'Track the progress of contracts you have sent.',
  },

  // --- entry points -------------------------------------------------------
  templates: { ko: '내 템플릿', en: 'My templates' },
  newContract: { ko: '새 계약 생성', en: 'Create contract' },

  /** Accessible name for the list landmark. */
  listLabel: { ko: '계약 목록', en: 'Contract list' },

  /** Transport failure. Neutral, and never blames the reader. */
  loadError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again shortly.',
  },
  retry: { ko: '다시 시도', en: 'Try again' },

  // --- plan + monthly quota ----------------------------------------------
  /** `{plan}` is the plan code (Free, PRO, …), which is not translated. */
  planName: { ko: '{plan} 플랜', en: '{plan} plan' },
  planFreeBadge: { ko: '무료', en: 'Free' },
  /**
   * The quota line is a stat: a label and its value, not a sentence wrapped
   * around a number. Splitting it this way is what lets the value keep its
   * emphasis in both locales without fixing Korean word order onto English.
   */
  quotaLabel: { ko: '이번 달 발송', en: 'Sent this month' },
  quotaCount: { ko: '{used}/{limit}건', en: '{used}/{limit}' },
  quotaBarLabel: { ko: '이번 달 발송 사용량', en: 'Monthly send usage' },
  quotaExhausted: {
    ko: '이번 달 무료 발송 {limit}건을 모두 사용했어요. 다음 달에 다시 발송할 수 있어요.',
    en: 'All {limit} free sends for this month are used. Sending resumes next month.',
  },
  upgrade: { ko: '업그레이드', en: 'Upgrade' },
  upgradeTitle: { ko: '곧 유료 플랜을 만나요', en: 'Paid plans are coming' },
  upgradeDescription: {
    ko: '더 넉넉한 발송 한도와 팀 기능을 준비하고 있어요. 조금만 기다려 주세요.',
    en: 'We are preparing higher send limits and team features. They will be available soon.',
  },
  upgradeConfirm: { ko: '알겠어요', en: 'Got it' },

  // --- list states --------------------------------------------------------
  emptyTitle: { ko: '아직 보낸 계약이 없어요', en: 'No contracts yet' },
  emptyDescription: {
    ko: '첫 계약을 만들고 받는 분에게 서명을 요청해 보세요.',
    en: 'Create your first contract and ask a recipient to sign it.',
  },
  /** Contracts exist, but none match the active summary-card filter. */
  filteredEmpty: {
    ko: '이 조건에 해당하는 계약이 없어요.',
    en: 'No contracts match this filter.',
  },
  clearFilter: { ko: '전체 보기', en: 'View all' },

  // --- urgency ------------------------------------------------------------
  // Shared verbatim by the urgency badge and the summary cards, so one urgency
  // reads with one word everywhere on the dashboard.
  urgencyOverdue: { ko: '기한 초과', en: 'Overdue' },
  urgencyDueSoon: { ko: '마감 임박', en: 'Due soon' },

  // --- next action --------------------------------------------------------
  // `actionSend` / `actionDownload` are the value-carrying next step;
  // `actionAwaiting` is a passive state with no action to take right now, and
  // doubles as the title of the awaiting-signature summary card.
  actionSend: { ko: '발송하기', en: 'Send' },
  actionAwaiting: { ko: '서명 대기 중', en: 'Awaiting signature' },
  actionDownload: { ko: '내려받기', en: 'Download' },

  // --- contract card meta line -------------------------------------------
  // English uses `label: value` rather than a counted noun so a count of one
  // stays correct without plural rules, which this catalog does not carry.
  metaRecipients: { ko: '받는 분 {count}명', en: 'Recipients: {count}' },
  metaPendingSigners: { ko: '서명 대기 {count}명', en: 'Awaiting signature: {count}' },
  metaPages: { ko: '{count}페이지', en: 'Pages: {count}' },
  metaSent: { ko: '{when} 발송', en: 'Sent {when}' },
  metaCreated: { ko: '{when} 생성', en: 'Created {when}' },
  timeJustNow: { ko: '방금 전', en: 'just now' },
  timeMinutes: { ko: '{count}분 전', en: '{count}m ago' },
  timeHours: { ko: '{count}시간 전', en: '{count}h ago' },
  timeDays: { ko: '{count}일 전', en: '{count}d ago' },

  /**
   * Accessible name pairing a group with how many contracts it holds — the
   * summary cards and the kanban column headers read the same way, so they
   * share one key rather than duplicating the pattern per group.
   */
  countLabel: { ko: '{label} {count}건', en: '{label}: {count}' },

  // --- view switcher ------------------------------------------------------
  viewList: { ko: '목록', en: 'List' },
  viewKanban: { ko: '칸반', en: 'Kanban' },
  viewSwitcherLabel: { ko: '뷰 전환', en: 'View' },

  // --- kanban board -------------------------------------------------------
  // Column headers use the product's lifecycle vocabulary; the same status word
  // appears on the status badge, which the API still supplies today.
  statusDraft: { ko: '작성 중', en: 'Draft' },
  statusScheduled: { ko: '예약됨', en: 'Scheduled' },
  statusInProgress: { ko: '진행 중', en: 'In progress' },
  statusCompleted: { ko: '완료됨', en: 'Completed' },
  statusCancelled: { ko: '취소됨', en: 'Cancelled' },
  kanbanEmptyColumn: { ko: '이 상태의 계약이 없어요.', en: 'No contracts in this status.' },
  kanbanBoardLabel: { ko: '칸반 보드', en: 'Kanban board' },

  // --- first-run guide ----------------------------------------------------
  onboardingTitle: {
    ko: '3단계로 첫 계약을 보내요',
    en: 'Send your first contract in three steps',
  },
  onboardingDescription: {
    ko: '이렇게 계약서를 보내고 서명을 받을 수 있어요. 준비되면 첫 계약을 만들어 보세요.',
    en: 'This is how you send a contract and collect a signature. Create your first one when you are ready.',
  },
  onboardingUploadTitle: { ko: '계약서 올리기', en: 'Upload a contract' },
  onboardingUploadDescription: {
    ko: '서명받을 PDF 계약서를 업로드해요.',
    en: 'Upload the PDF you need signed.',
  },
  onboardingRequestTitle: { ko: '서명 요청 보내기', en: 'Request a signature' },
  onboardingRequestDescription: {
    ko: '받는 분에게 서명 위치를 지정하고 발송해요.',
    en: 'Place the signature fields for each recipient and send it.',
  },
  onboardingTrackTitle: { ko: '완료까지 추적하기', en: 'Track it to completion' },
  onboardingTrackDescription: {
    ko: '서명 요청부터 완료까지 대시보드에서 한눈에 확인해요.',
    en: 'Follow every contract from request to completion on your dashboard.',
  },
  onboardingCta: { ko: '첫 계약 만들기', en: 'Create your first contract' },
} as const satisfies WebTranslationDomain;
