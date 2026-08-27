import type { WebTranslationDomain } from './types';

/**
 * Settings copy: the app header that carries the settings entry point, the
 * settings shell (title, navigation), the Branding section — its form, image
 * uploaders, brand-color control and live preview — and the Language section.
 *
 * The *language* preview strings are deliberately duplicated here rather than
 * borrowed from `dashboard`/`signer`: that preview must render in the locale
 * being *previewed*, which is not the locale the surrounding page uses, so it
 * needs keys it owns. The *branding* preview is the opposite case — it mirrors
 * the real header, so it reuses `common.product` and `settings.entry` rather
 * than restating them, and a rename stays single-source.
 */
export const SETTINGS_TRANSLATIONS = {
  // --- app header ---------------------------------------------------------
  /** Ghost link into the settings section; also the header chip in the branding preview. */
  entry: { ko: '설정', en: 'Settings' },
  logout: { ko: '로그아웃', en: 'Sign out' },
  /** Alt text for the uploaded branding logo. `{product}` is `common.product`. */
  brandLogoAlt: { ko: '{product} 로고', en: '{product} logo' },

  // --- shell --------------------------------------------------------------
  title: { ko: '설정', en: 'Settings' },
  /** Accessible name for the settings navigation landmark. */
  navLabel: { ko: '설정 메뉴', en: 'Settings menu' },
  branding: { ko: '브랜딩', en: 'Branding' },
  language: { ko: '언어', en: 'Language' },

  // --- branding section ---------------------------------------------------
  brandingTitle: { ko: '브랜딩', en: 'Branding' },
  brandingDescription: {
    ko: '로고, 파비콘, 대표 색상을 설정해 서비스 전반에 우리 브랜드를 입혀요.',
    en: 'Set a logo, a favicon, and a brand color to carry your brand across the service.',
  },
  logoLabel: { ko: '로고', en: 'Logo' },
  faviconLabel: { ko: '파비콘', en: 'Favicon' },
  /** Shown when an asset is already stored. `{limit}` is the enforced size cap in MB. */
  logoSetHint: {
    ko: '지금 설정된 로고가 있어요. 새 SVG 또는 PNG(최대 {limit}MB)를 올리면 바뀌어요.',
    en: 'A logo is already set. Upload a new SVG or PNG (up to {limit}MB) to replace it.',
  },
  faviconSetHint: {
    ko: '지금 설정된 파비콘이 있어요. 새 SVG 또는 PNG(최대 {limit}MB)를 올리면 바뀌어요.',
    en: 'A favicon is already set. Upload a new SVG or PNG (up to {limit}MB) to replace it.',
  },
  /** Persists the branding inputs. Distinct from `save`, which the language section uses. */
  brandingSave: { ko: '저장', en: 'Save' },
  brandingSaved: {
    ko: '브랜딩 설정을 저장했어요. 서비스 전반에 바로 반영했어요.',
    en: 'Branding saved. It is already live across the service.',
  },

  // --- image uploader (logo · favicon) ------------------------------------
  // `{limit}` is always `MAX_IMAGE_MB`, so the sentence that states the cap and
  // the number that enforces it cannot drift apart.
  imageHint: { ko: 'SVG 또는 PNG · 최대 {limit}MB', en: 'SVG or PNG · Up to {limit}MB' },
  imageInvalidType: {
    ko: 'SVG 또는 PNG 파일만 올릴 수 있어요. 다른 파일로 다시 시도해 주세요.',
    en: 'Only SVG and PNG files can be uploaded. Try another file.',
  },
  imageEmpty: {
    ko: '파일이 비어 있어요. 다른 파일로 다시 시도해 주세요.',
    en: 'That file is empty. Try another file.',
  },
  imageTooLarge: {
    ko: '파일이 너무 커요. {limit}MB 이하의 SVG 또는 PNG 파일로 올려 주세요.',
    en: 'That file is too large. Upload an SVG or PNG under {limit}MB.',
  },
  imageReplace: { ko: '다른 파일', en: 'Choose another' },
  imageRemove: { ko: '제거', en: 'Remove' },
  imagePick: { ko: '파일 선택', en: 'Choose a file' },
  imageDropActive: { ko: '여기에 놓으면 올라가요', en: 'Drop it here to upload' },
  /** `{label}` is the field label (`로고` / `파비콘`), so the zone names its own field. */
  imageDropPrompt: {
    ko: '{label} 이미지를 끌어다 놓으세요',
    en: 'Drag and drop the {label} image',
  },
  /** Used when the field label is not plain text and cannot be woven into a sentence. */
  imageDropPromptGeneric: { ko: '이미지를 끌어다 놓으세요', en: 'Drag and drop an image' },
  imageDropHint: { ko: '또는 클릭해서 파일을 선택하세요', en: 'Or click to choose a file' },
  imageSaved: { ko: '현재 설정된 {label}', en: 'Current {label}' },
  imageSavedGeneric: { ko: '현재 설정된 이미지', en: 'Current image' },
  imageSavedHint: { ko: '새로 올리면 교체돼요', en: 'Uploading a new one replaces it' },

  // --- brand color --------------------------------------------------------
  colorLabel: { ko: '대표 색상', en: 'Brand color' },
  colorHint: {
    ko: '버튼·링크 같은 주요 요소에 쓰일 색이에요. #163AF2처럼 색상 코드를 입력하거나 색상판에서 골라요.',
    en: 'Used for primary elements such as buttons and links. Enter a color code like #163AF2, or pick one from the swatch.',
  },
  colorInvalid: {
    ko: '색상 코드를 확인해 주세요. #163AF2처럼 3자리 또는 6자리로 입력해요.',
    en: 'Check the color code. Enter 3 or 6 digits, like #163AF2.',
  },
  /** Accessible name for the chip that opens the native color picker. */
  colorSwatch: { ko: '색상판에서 대표 색상 고르기', en: 'Pick a brand color from the swatch' },

  // --- branding preview ---------------------------------------------------
  previewLabel: { ko: '미리보기', en: 'Preview' },
  brandingPreviewDescription: {
    ko: '고른 로고·파비콘·색상이 서비스에 어떻게 보일지 저장 전에 확인해요.',
    en: 'See how the logo, favicon, and color you picked will look before you save.',
  },
  previewHeader: { ko: '헤더', en: 'Header' },
  previewTab: { ko: '브라우저 탭', en: 'Browser tab' },
  previewAccent: { ko: '강조 색상', en: 'Accent color' },
  previewLogoAlt: { ko: '로고 미리보기', en: 'Logo preview' },
  previewFaviconAlt: { ko: '파비콘 미리보기', en: 'Favicon preview' },
  /** Sample primary elements — shared by the color picker and the preview panel. */
  previewSampleButton: { ko: '서명 요청 보내기', en: 'Send a signature request' },
  previewSampleLink: { ko: '계약서 미리보기', en: 'Preview the contract' },

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
