import type { WebTranslationDomain } from './types';

/**
 * Contract-detail copy: everything the sender sees on `/contracts/[id]` — the
 * summary of one contract, and the share links that let someone open and fill it
 * without an account.
 *
 * Both halves live here because they are one screen and one audience: the owner
 * of the contract. The recipient's side of a share link (the password gate and
 * the read-only view they land on) is a different audience with a different
 * locale source, so it stays in `share`.
 *
 * Share-link keys carry a `link…` prefix rather than a nested `link.*` path —
 * the catalog is deliberately two levels deep (`messaging/i18n-key-naming-and-voice`),
 * so grouping is expressed in the name and in the section comments below.
 */
export const CONTRACTS_TRANSLATIONS = {
  // --- detail shell -------------------------------------------------------
  /** Back affordance → the contract list. Also the not-found terminal's CTA. */
  back: { ko: '계약 목록', en: 'Contracts' },
  backLabel: { ko: '계약 목록으로 돌아가기', en: 'Back to contracts' },
  loadError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again in a moment.',
  },
  retry: { ko: '다시 시도', en: 'Try again' },
  notFoundTitle: { ko: '계약을 찾을 수 없어요', en: 'We could not find that contract' },
  notFoundDescription: {
    ko: '이미 삭제되었거나 접근할 수 없는 계약이에요.',
    en: 'It was deleted, or it is not shared with your account.',
  },
  /** The terminal's way out. A destination, where `back` is a nav affordance. */
  notFoundAction: { ko: '계약 목록으로', en: 'Go to contracts' },

  // --- summary definition list --------------------------------------------
  // The term (`dt`) carries the noun in both locales, so the value (`dd`) is
  // only the number in English. Korean keeps its counter suffix, which is the
  // natural reading there — neither locale is a transliteration of the other.
  summaryRecipients: { ko: '받는 분', en: 'Recipients' },
  summaryRecipientCount: { ko: '{count}명', en: '{count}' },
  /** Shown instead of a count when the contract is shared by link only. */
  summaryLinkOnly: { ko: '링크 공유', en: 'Link only' },
  summaryPages: { ko: '분량', en: 'Pages' },
  summaryPageCount: { ko: '{count}페이지', en: '{count}' },
  summaryCreated: { ko: '생성일', en: 'Created' },
  summarySent: { ko: '발송일', en: 'Sent' },
  summaryCompleted: { ko: '완료일', en: 'Completed' },

  // --- share-link section on the detail screen ----------------------------
  shareTitle: { ko: '공유 링크', en: 'Share links' },
  shareDescription: {
    ko: '링크를 만들어 받는 분에게 전달하면, 로그인 없이 계약서를 열고 작성할 수 있어요.',
    en: 'Send someone a link and they can open and fill the contract without an account.',
  },
  shareCreate: { ko: '링크로 공유', en: 'Share a link' },
  shareEmptyTitle: { ko: '아직 만든 공유 링크가 없어요', en: 'No share links yet' },
  shareEmptyDescription: {
    ko: '‘링크로 공유’를 눌러 첫 링크를 만들어 보세요.',
    en: 'Select “Share a link” to create the first one.',
  },

  // --- share-link dialog: settings ----------------------------------------
  linkDialogTitle: { ko: '링크로 공유하기', en: 'Share with a link' },
  linkDialogDescription: {
    ko: '링크를 받은 사람이 계약서를 열람하고 작성할 수 있어요.',
    en: 'Anyone holding the link can open and fill the contract.',
  },
  linkExpiryLabel: { ko: '유효 기간', en: 'Valid for' },
  linkExpiryHelp: {
    ko: '유효 기간이 지나면 링크가 자동으로 만료돼요.',
    en: 'The link stops working once its validity period ends.',
  },
  // Validity presets. `lib/sharing.ts` carries these keys, not the words, so the
  // window in days and the label it renders as cannot drift apart.
  linkExpiry1Day: { ko: '1일', en: '1 day' },
  linkExpiry3Days: { ko: '3일', en: '3 days' },
  linkExpiry1Week: { ko: '1주일', en: '1 week' },
  linkExpiry1Month: { ko: '1개월', en: '1 month' },
  linkExpiryNone: { ko: '만료 없음', en: 'No expiry' },

  // --- share-link dialog: password protection -----------------------------
  linkPasswordToggle: { ko: '비밀번호로 보호하기', en: 'Protect with a password' },
  linkPasswordLabel: { ko: '비밀번호', en: 'Password' },
  linkPasswordPlaceholder: { ko: '비밀번호를 입력해 주세요', en: 'Enter a password' },
  /**
   * Serves both the create dialog and the per-link editor: the same fact, told
   * to the same person, at the two moments a password gets set.
   */
  linkPasswordHint: {
    ko: '이 비밀번호를 입력해야 계약서를 열 수 있어요. 받는 분에게 따로 알려 주세요.',
    en: 'The recipient needs this password to open the contract. Send it to them separately.',
  },
  linkPasswordTooShort: {
    ko: '비밀번호는 {count}자 이상으로 입력해 주세요.',
    en: 'Use at least {count} characters.',
  },

  // --- share-link dialog: generate + result -------------------------------
  linkCreate: { ko: '링크 만들기', en: 'Create link' },
  linkCreating: { ko: '만드는 중', en: 'Creating' },
  /** Field label over the generated URL; also the fallback name of an unlabelled link. */
  linkLabel: { ko: '공유 링크', en: 'Share link' },
  linkCopy: { ko: '복사', en: 'Copy' },
  linkCopied: { ko: '복사됨', en: 'Copied' },
  /** Brief confirmation surfaced to assistive tech via role="status". */
  linkCopyToast: { ko: '링크를 복사했어요', en: 'Link copied' },
  /** `{date}` is a calendar date already written in the reader's language. */
  linkExpiryNote: { ko: '{date}까지 열 수 있어요.', en: 'Can be opened until {date}.' },
  linkNoExpiryNote: { ko: '만료 없이 계속 열 수 있어요.', en: 'Stays open with no expiry.' },
  linkCreateError: {
    ko: '링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not create the link. Please try again in a moment.',
  },
  linkCopyError: {
    ko: '링크를 복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.',
    en: 'We could not copy the link. Select it and copy it manually.',
  },

  // --- share-link list ----------------------------------------------------
  // Lifecycle states. `revoked` reads as 중지됨 / Disabled rather than "revoked":
  // the owner turned the link off, and the pill sits next to the action that
  // did it, so both must use the same word.
  linkStateActive: { ko: '사용 중', en: 'Active' },
  linkStateExpired: { ko: '만료됨', en: 'Expired' },
  linkStateRevoked: { ko: '중지됨', en: 'Disabled' },
  linkStateCompleted: { ko: '제출 완료', en: 'Submitted' },
  /** Tag on a row whose link asks for a password before it opens. */
  linkPasswordTag: { ko: '비밀번호', en: 'Password' },
  linkRevoke: { ko: '사용 중지', en: 'Disable' },
  linkRevoking: { ko: '중지하는 중', en: 'Disabling' },
  /** a11y name for a row's disable action; `{label}` names the link. */
  linkRevokeLabel: { ko: '{label} 링크 사용 중지', en: 'Disable the {label} link' },
  linkListError: {
    ko: '링크 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not load the links. Please try again in a moment.',
  },
  linkRevokeError: {
    ko: '링크를 중지하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not disable the link. Please try again in a moment.',
  },

  // --- per-link password panel (owner only) -------------------------------
  /** Row trigger — which word depends on whether a password is already set. */
  linkPasswordOpen: { ko: '비밀번호 확인', en: 'View password' },
  linkPasswordSet: { ko: '비밀번호 설정', en: 'Set password' },
  linkPasswordClose: { ko: '닫기', en: 'Close' },
  /** a11y name for that trigger; `{label}` names the link. */
  linkPasswordManageLabel: {
    ko: '{label} 링크 비밀번호 관리',
    en: 'Manage the password for the {label} link',
  },
  linkPasswordLoading: { ko: '불러오는 중', en: 'Loading' },
  linkPasswordHintNone: {
    ko: '설정된 비밀번호가 없어요. 새 비밀번호를 입력하면 링크에 비밀번호를 걸 수 있어요.',
    en: 'This link has no password. Enter one to start asking for it.',
  },
  /**
   * A password stored before the confirm feature existed: it is a hash, so it
   * can be replaced but never shown. Says what to do next, not what went wrong.
   */
  linkPasswordHintLegacy: {
    ko: '이전에 설정한 비밀번호는 확인할 수 없어요. 새 비밀번호를 설정하면 다시 확인할 수 있어요.',
    en: 'The password set earlier cannot be shown. Set a new one to make it viewable again.',
  },
  linkPasswordSave: { ko: '저장', en: 'Save' },
  linkPasswordSaving: { ko: '저장하는 중', en: 'Saving' },
  linkPasswordRemove: { ko: '비밀번호 해제', en: 'Remove password' },
  linkPasswordRemoving: { ko: '해제하는 중', en: 'Removing' },
  linkPasswordSavedSet: { ko: '비밀번호를 설정했어요.', en: 'Password set.' },
  linkPasswordSavedChanged: { ko: '비밀번호를 변경했어요.', en: 'Password changed.' },
  linkPasswordSavedRemoved: {
    ko: '비밀번호 보호를 해제했어요.',
    en: 'Password protection removed.',
  },
  linkPasswordLoadError: {
    ko: '비밀번호를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not load the password. Please try again in a moment.',
  },
  linkPasswordSaveError: {
    ko: '비밀번호를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not save the password. Please try again in a moment.',
  },
} as const satisfies WebTranslationDomain;
