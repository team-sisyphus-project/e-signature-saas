import type { WebTranslationDomain } from './types';

/**
 * Sender dashboard copy: the contract list shell — heading, entry points, list
 * landmark, and the load-failure line.
 *
 * Card-level and summary copy still lives in `lib/todo-copy.ts`; this domain
 * owns only what the dashboard shell itself renders.
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
} as const satisfies WebTranslationDomain;
