import type { WebTranslationDomain } from './types';

/**
 * Settings copy: the settings shell (title, navigation) and the Language
 * Settings section, including its live preview and save states.
 *
 * The preview strings are deliberately duplicated here rather than borrowed from
 * `dashboard`/`signer`: the preview must render in the locale being *previewed*,
 * which is not the locale the surrounding page uses, so it needs keys it owns.
 */
export const SETTINGS_TRANSLATIONS = {
  // --- shell --------------------------------------------------------------
  title: { ko: '설정', en: 'Settings' },
  /** Accessible name for the settings navigation landmark. */
  navLabel: { ko: '설정 메뉴', en: 'Settings menu' },
  branding: { ko: '브랜딩', en: 'Branding' },
  language: { ko: '언어', en: 'Language' },

  // --- language section ---------------------------------------------------
  languageTitle: { ko: '언어 설정', en: 'Language settings' },
  languageDescription: {
    ko: '서비스에서 사용할 언어를 선택하세요. 모든 화면에 적용됩니다.',
    en: 'Choose the language used throughout the service.',
  },
  preference: { ko: '선호 언어', en: 'Preferred language' },
  /** Language names stay in their own language, so a lost user can find their way back. */
  korean: { ko: '한국어 (Korean)', en: '한국어 (Korean)' },
  english: { ko: 'English', en: 'English' },

  // --- live preview -------------------------------------------------------
  previewTitle: { ko: '실시간 미리보기', en: 'Live preview' },
  previewDashboard: { ko: '대시보드', en: 'Dashboard' },
  previewEmail: { ko: '완료 알림 이메일', en: 'Completion email' },
  previewStatus: { ko: '서명 대기 중', en: 'Awaiting signature' },
  previewAction: { ko: '새 계약 보내기', en: 'Send new contract' },
  previewEmailSubject: {
    ko: '[계약 완료] 계약서 서명이 완료되었습니다',
    en: '[Contract completed] Your contract has been signed',
  },

  // --- save states --------------------------------------------------------
  cancel: { ko: '취소', en: 'Cancel' },
  save: { ko: '변경사항 저장', en: 'Save changes' },
  saving: { ko: '저장 중…', en: 'Saving…' },
  saved: { ko: '언어 설정이 저장되었습니다.', en: 'Language setting saved.' },
  saveFailed: {
    ko: '언어 설정을 저장하지 못했습니다. 다시 시도해 주세요.',
    en: 'We could not save your language setting. Please try again.',
  },
  retry: { ko: '다시 시도', en: 'Try again' },
} as const satisfies WebTranslationDomain;
