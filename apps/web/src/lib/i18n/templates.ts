import type { WebTranslationDomain } from './types';

/**
 * Templates copy: the `내 템플릿` list — heading, empty and error states, the
 * per-card meta line, the management actions (preview · rename · delete · start
 * from template) with their dialogs, and the read-only field-overlay preview
 * surface those dialogs mount.
 *
 * The whole domain is one flow: a sender arrives to *reuse* a saved layout, and
 * everything here either describes a saved layout or acts on one. The preview
 * surface only ever shows where fields sit, so its voice stays purely
 * descriptive — no edit or save verbs anywhere in it.
 */
export const TEMPLATES_TRANSLATIONS = {
  // --- list ---------------------------------------------------------------
  title: { ko: '내 템플릿', en: 'My templates' },
  description: {
    ko: '저장해 둔 양식을 모아 봐요. 새 계약을 만들 때 바로 불러올 수 있어요.',
    en: 'Every layout you have saved. Load one the moment you start a new contract.',
  },
  /** Accessible name for the list landmark. */
  listLabel: { ko: '템플릿 목록', en: 'Template list' },
  emptyTitle: { ko: '아직 저장한 템플릿이 없어요', en: 'No saved templates yet' },
  emptyDescription: {
    ko: '자주 쓰는 양식을 템플릿으로 저장해 두면, 다음부터는 필드 배치 없이 바로 발송할 수 있어요.',
    en: 'Save a layout you use often and next time you can send without placing fields again.',
  },
  /** Empty-state CTA → the wizard, the only place a template gets saved. */
  emptyCta: { ko: '새 계약 만들기', en: 'Create a contract' },
  loadError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again in a moment.',
  },
  retry: { ko: '다시 시도', en: 'Try again' },
  close: { ko: '닫기', en: 'Close' },

  // --- per-card meta line -------------------------------------------------
  // English uses `label: value` rather than a counted noun so a count of one
  // stays correct without plural rules, which this catalog does not carry.
  metaPages: { ko: '{count}페이지', en: 'Pages: {count}' },
  metaFields: { ko: '필드 {count}개', en: 'Fields: {count}' },
  /** `{when}` is a relative timestamp, already rendered in the reader's language. */
  metaSaved: { ko: '{when} 저장', en: 'Saved {when}' },

  // --- per-card management actions ----------------------------------------
  start: { ko: '이 템플릿으로 시작', en: 'Start from this template' },
  preview: { ko: '미리보기', en: 'Preview' },
  rename: { ko: '이름 수정', en: 'Rename' },
  delete: { ko: '삭제', en: 'Delete' },
  /** a11y group name for the action cluster; `{name}` is the template name. */
  actionsLabel: { ko: '{name} 관리', en: 'Manage {name}' },
  cancel: { ko: '취소', en: 'Cancel' },
  save: { ko: '저장', en: 'Save' },

  // --- rename dialog ------------------------------------------------------
  renameTitle: { ko: '템플릿 이름 수정', en: 'Rename template' },
  renameDescription: {
    ko: '목록에서 찾기 쉬운 이름으로 바꿔 주세요.',
    en: 'Give it a name you will recognise in the list.',
  },
  renameNameLabel: { ko: '템플릿 이름', en: 'Template name' },
  renameNamePlaceholder: { ko: '예: 표준 근로계약서', en: 'e.g. Standard employment contract' },

  // --- delete-confirm dialog ---------------------------------------------
  // Names the consequence plainly and reassures about what is *not* affected.
  deleteTitle: { ko: "'{name}'을(를) 삭제할까요?", en: 'Delete “{name}”?' },
  deleteDescription: {
    ko: '삭제하면 되돌릴 수 없어요. 이미 발송한 계약에는 영향을 주지 않아요.',
    en: 'This cannot be undone. Contracts you have already sent are not affected.',
  },

  // --- rollback banners ---------------------------------------------------
  // The optimistic update was reverted: say what was put back, not what failed.
  renameFailed: {
    ko: '이름을 바꾸지 못해 원래대로 되돌렸어요.',
    en: 'We could not rename it, so the previous name is back.',
  },
  deleteFailed: {
    ko: '삭제하지 못해 목록에 다시 넣었어요.',
    en: 'We could not delete it, so it is back in the list.',
  },

  // --- preview dialog -----------------------------------------------------
  previewTitle: { ko: '{name} 미리보기', en: '{name} preview' },
  previewDescription: {
    ko: '저장된 서명·날짜·텍스트란이 PDF 어디에 놓이는지 확인해 보세요. 미리보기는 템플릿을 바꾸지 않아요.',
    en: 'Check where the saved signature, date, and text fields sit on the PDF. Previewing never changes the template.',
  },
  previewError: {
    ko: '미리보기를 불러오지 못했어요.',
    en: 'We could not load the preview.',
  },

  // --- field-overlay preview surface --------------------------------------
  /** Accessible name for the rendered page canvas. `{page}`/`{total}` are 1-based. */
  previewPageLabel: {
    ko: '템플릿 {page}/{total}페이지 미리보기',
    en: 'Template preview, page {page} of {total}',
  },
  previewPrevPage: { ko: '이전 페이지', en: 'Previous page' },
  previewNextPage: { ko: '다음 페이지', en: 'Next page' },
  /** Page position indicator. Digits and a separator read the same in both locales. */
  previewPageIndicator: { ko: '{page} / {total}', en: '{page} / {total}' },
  previewLegendLabel: { ko: '필드 종류', en: 'Field types' },
  /** Explains the number badge — shown only when a template has 2+ recipients. */
  previewRecipientHint: {
    ko: '박스 왼쪽 위 숫자는 서명할 수신자 순서예요.',
    en: 'The number at the top left of each box is the signing order.',
  },
  previewNoFields: {
    ko: '이 페이지에는 배치된 필드가 없어요.',
    en: 'No fields are placed on this page.',
  },
  previewReadError: {
    ko: 'PDF를 읽을 수 없어요. 파일이 손상되지 않았는지 확인해 주세요.',
    en: 'We could not read the PDF. Check that the file is not damaged.',
  },
} as const satisfies WebTranslationDomain;
