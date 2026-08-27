import type { WebTranslationDomain } from './types';

/**
 * Send-wizard copy: the start chooser on `/contracts/new` and the wizard shell
 * (wordmark, exit affordance).
 *
 * Per-step copy — upload, field placement, recipients, review — is added here as
 * each step is migrated off `lib/new-contract-copy.ts`.
 */
export const WIZARD_TRANSLATIONS = {
  // --- start chooser ------------------------------------------------------
  chooseTitle: { ko: '새 계약을 만들어요', en: 'Create a new contract' },
  chooseSubtitle: { ko: '어떻게 시작할지 골라 주세요.', en: 'Choose how you would like to begin.' },
  uploadTitle: { ko: '새로 업로드', en: 'Upload a PDF' },
  uploadBody: {
    ko: 'PDF를 올리고 서명 필드를 직접 배치해요.',
    en: 'Upload a PDF and place signature fields yourself.',
  },
  templateTitle: { ko: '내 템플릿에서 시작', en: 'Start from a template' },
  templateBody: {
    ko: '저장해 둔 양식을 불러와 수신자만 입력하면 돼요.',
    en: 'Load a saved layout and add recipients to send it right away.',
  },

  // --- wizard shell -------------------------------------------------------
  product: { ko: '전자계약', en: 'eSign' },
  exit: { ko: '나가기', en: 'Exit' },
  /** Accessible name for the exit control. */
  exitLabel: { ko: '계약 생성 나가기', en: 'Exit contract creation' },
} as const satisfies WebTranslationDomain;
