import type { WebTranslationDomain } from './types';

/**
 * Send-wizard copy: everything rendered between "create a contract" and "it is
 * on its way" — the start chooser and template picker on `/contracts/new`, the
 * wizard shell, and each step (upload, field placement, delivery method,
 * recipients, review/send, share link) plus the save-as-template dialog that
 * branches off field placement.
 *
 * One domain because it is one flow. A translator reads this file top to bottom
 * and sees every word a sender can meet while building a contract, in the order
 * they meet it. Copy that used to live in `lib/new-contract-copy.ts`, in each
 * step's local `COPY` constant, and inline in JSX now resolves from here; no
 * component owns wording, and no wording exists outside the catalog.
 *
 * Sentences carrying a value are one key with a `{slot}`, never fragments
 * concatenated at the call site — a fragment order that reads correctly in
 * Korean does not survive translation.
 *
 * Field-type words (Signature / Date / Text) are deliberately absent: the
 * templates preview renders the same vocabulary, so it lives in `common`.
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
  next: { ko: '다음', en: 'Next' },
  back: { ko: '이전', en: 'Back' },
  cancel: { ko: '취소', en: 'Cancel' },
  retry: { ko: '다시 시도', en: 'Try again' },
  /** Neutral transport failure. Never blames the reader. */
  genericError: {
    ko: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong. Please try again shortly.',
  },

  /**
   * Step-indicator labels. Short nouns: they sit in a row of six and are read
   * as a map of the flow, not as instructions.
   */
  stepUpload: { ko: '업로드', en: 'Upload' },
  stepFields: { ko: '필드 배치', en: 'Fields' },
  stepDelivery: { ko: '전달 방법', en: 'Delivery' },
  stepRecipients: { ko: '받는 분', en: 'Recipients' },
  stepReview: { ko: '발송 검토', en: 'Review' },
  stepLink: { ko: '링크 공유', en: 'Share link' },

  // --- template picker ----------------------------------------------------
  pickTitle: { ko: '템플릿을 선택해 주세요', en: 'Choose a template' },
  pickSubtitle: {
    ko: '고르면 PDF와 필드 배치를 그대로 불러와요. 수신자만 입력하면 바로 발송할 수 있어요.',
    en: 'The PDF and its field layout load exactly as saved. Add recipients and send.',
  },
  pickBack: { ko: '뒤로', en: 'Back' },
  /** Accessible name for the picker list landmark. */
  listLabel: { ko: '템플릿 목록', en: 'Template list' },
  /** Accessible name of one selectable template card. */
  selectLabel: { ko: '{name} 템플릿으로 시작', en: 'Start from the {name} template' },
  emptyTitle: { ko: '아직 저장한 템플릿이 없어요', en: 'You have no saved templates yet' },
  emptyBody: {
    ko: '자주 쓰는 양식을 템플릿으로 저장해 두면, 다음부터는 필드 배치 없이 바로 발송할 수 있어요.',
    en: 'Save a layout you use often as a template, and every send after that skips field placement.',
  },
  /** Empty-state CTA — falls back to the upload path. */
  emptyCta: { ko: '새로 업로드', en: 'Upload a PDF' },
  preparingTitle: { ko: '템플릿을 불러오고 있어요', en: 'Loading the template' },
  preparingBody: {
    ko: 'PDF와 필드 배치를 준비하고 있어요. 잠시만 기다려 주세요.',
    en: 'We are preparing the PDF and its field layout. This takes a moment.',
  },
  /** Bail out of a failed prepare, back to the start choice. */
  startOver: { ko: '다른 방법으로 시작', en: 'Start a different way' },

  // --- step: upload -------------------------------------------------------
  uploadStepTitle: { ko: '계약 PDF를 올려 주세요', en: 'Upload the contract PDF' },
  /** `{limit}` is the size cap in megabytes, shared with `guardTooLarge`. */
  uploadStepSubtitle: {
    ko: '서명을 받을 PDF 문서를 끌어다 놓거나 직접 선택하세요. 최대 {limit}MB까지 올릴 수 있어요.',
    en: 'Drag in the PDF you need signed, or choose a file. Up to {limit}MB.',
  },
  dropIdle: { ko: 'PDF를 끌어다 놓으세요', en: 'Drag a PDF here' },
  dropActive: { ko: '여기에 놓으면 업로드돼요', en: 'Drop to upload' },
  dropOr: { ko: '또는 클릭해서 파일을 선택하세요', en: 'Or click to choose a file' },
  dropPick: { ko: '파일 선택', en: 'Choose file' },

  /**
   * Client-side upload guards, kept in lockstep with the server's own wording
   * (`apps/api/src/common/messages.ts`) so a rejected file reads the same
   * before and after a round-trip.
   */
  guardInvalidType: { ko: 'PDF 파일만 업로드할 수 있어요.', en: 'Only PDF files can be uploaded.' },
  guardTooLarge: {
    ko: '파일이 너무 커요. {limit}MB 이하의 PDF로 올려 주세요.',
    en: 'That file is too large. Upload a PDF of {limit}MB or less.',
  },
  guardEmpty: {
    ko: '파일이 비어 있어요. 다른 PDF로 다시 시도해 주세요.',
    en: 'That file is empty. Try another PDF.',
  },

  uploadProgress: { ko: '업로드 중 {percent}%', en: 'Uploading {percent}%' },
  /** Shown once the bytes are in and the server is still parsing pages. */
  uploadPreparing: { ko: '문서를 준비하고 있어요', en: 'Preparing the document' },
  uploadProgressLabel: { ko: '업로드 진행률', en: 'Upload progress' },
  replaceFile: { ko: '다른 파일', en: 'Replace' },
  /**
   * Page count as a labelled stat rather than a counted noun: it is one segment
   * of a middle-dot meta line, and the label form needs no plural rule.
   */
  pageCount: { ko: '{count}페이지', en: 'Pages: {count}' },
  previewLabel: {
    ko: '업로드한 PDF 첫 페이지 미리보기',
    en: 'Preview of the first page of the uploaded PDF',
  },
  pdfReadError: {
    ko: 'PDF를 읽을 수 없어요. 파일이 손상되지 않았는지 확인해 주세요.',
    en: 'This PDF could not be opened. Check that the file is not damaged.',
  },

  // --- step: field placement ----------------------------------------------
  fieldsTitle: { ko: '서명 필드를 배치해 주세요', en: 'Place the signature fields' },
  fieldsSubtitle: {
    ko: '받는 분이 서명할 위치에 필드를 끌어다 놓으세요. 클릭하면 가운데에 추가돼요.',
    en: 'Drag a field to where the recipient signs. Clicking adds one at the center of the page.',
  },
  saveTemplate: { ko: '템플릿으로 저장', en: 'Save as template' },
  fieldCounts: {
    ko: '이 페이지에 {page}개 · 전체 {total}개',
    en: 'On this page: {page} · Total: {total}',
  },
  prevPage: { ko: '이전 페이지', en: 'Previous page' },
  nextPage: { ko: '다음 페이지', en: 'Next page' },
  pageIndicator: { ko: '{page} / {total} 페이지', en: 'Page {page} of {total}' },
  zoomOut: { ko: '축소', en: 'Zoom out' },
  zoomIn: { ko: '확대', en: 'Zoom in' },
  placeHint: {
    ko: '위 도구를 PDF 위로 끌어다 놓아 필드를 배치하세요',
    en: 'Drag a tool from above onto the PDF to place a field',
  },
  keyboardHint: {
    ko: '필드를 선택한 뒤 방향키로 이동, Shift+방향키로 크기 조절, Delete로 삭제할 수 있어요.',
    en: 'Select a field, then move it with the arrow keys, resize it with Shift+arrows, and remove it with Delete.',
  },
  /** `{field}` is a `common.field*` word. */
  fieldToolLabel: {
    ko: '{field} 필드 추가 (끌어다 놓거나 클릭)',
    en: 'Add a {field} field (drag or click)',
  },
  desktopOnlyTitle: { ko: '데스크톱에서 필드를 배치해 주세요', en: 'Place fields on a desktop' },
  desktopOnlyBody: {
    ko: '서명 필드 배치는 마우스가 있는 큰 화면에 맞춰져 있어요. 데스크톱에서 이어서 진행해 주세요.',
    en: 'Field placement is built for a large screen with a mouse. Continue on a desktop.',
  },

  /** Accessible names on the placement canvas. */
  pageCanvasLabel: { ko: '계약 PDF {page}페이지', en: 'Contract PDF, page {page}' },
  fieldBoxLabel: {
    ko: '{field} 필드. 방향키로 이동, Shift+방향키로 크기 조절, Delete로 삭제',
    en: '{field} field. Arrow keys move, Shift+arrows resize, Delete removes',
  },
  fieldDeleteLabel: { ko: '{field} 필드 삭제', en: 'Remove the {field} field' },

  // --- step: delivery method ----------------------------------------------
  deliveryTitle: { ko: '어떻게 전달할까요?', en: 'How should this be delivered?' },
  deliveryDescription: {
    ko: '완성한 계약서를 받는 분에게 전달할 방법을 선택하세요.',
    en: 'Choose how the finished contract reaches its recipient.',
  },
  deliveryEmail: { ko: '이메일로 보내기', en: 'Send by email' },
  deliveryEmailBody: {
    ko: '받는 분에게 서명 요청을 보내요.',
    en: 'Send a signature request to each recipient.',
  },
  deliveryLink: { ko: '링크로 공유하기', en: 'Share a link' },
  deliveryLinkBody: {
    ko: '링크를 받은 누구나 열람하고 작성할 수 있어요.',
    en: 'Anyone with the link can open and fill in the contract.',
  },

  // --- step: recipients ---------------------------------------------------
  recipientsTitle: { ko: '받는 분을 입력해 주세요', en: 'Add the recipients' },
  recipientsSubtitle: {
    ko: '서명할 분의 이름과 이메일을 서명 받을 순서대로 추가하세요.',
    en: 'Add each signer with their name and email, in the order they should sign.',
  },
  /** Stand-in name for a recipient who has not been named yet. */
  recipientFallback: { ko: '받는 분 {index}', en: 'Recipient {index}' },
  nameLabel: { ko: '이름', en: 'Name' },
  namePlaceholder: { ko: '홍길동', en: 'Jane Doe' },
  emailLabel: { ko: '이메일', en: 'Email' },

  /** Inline validation. States the fix, never the reader's mistake. */
  emailRequired: { ko: '이메일을 입력해 주세요.', en: 'Enter an email address.' },
  emailInvalid: { ko: '이메일 형식을 다시 확인해 주세요.', en: 'Check the email address format.' },
  emailDuplicate: { ko: '이미 추가된 이메일이에요.', en: 'This email is already on the list.' },

  addRecipient: { ko: '받는 분 추가', en: 'Add recipient' },
  maxRecipients: {
    ko: '받는 분은 최대 {count}명까지 추가할 수 있어요.',
    en: 'You can add up to {count} recipients.',
  },
  signingOrderLabel: { ko: '서명 순서 {index}번째', en: 'Signing order: {index}' },
  /** `{name}` is a recipient's name, or `recipientFallback` when unnamed. */
  moveUpLabel: { ko: '{name} 위로 이동', en: 'Move {name} up' },
  moveDownLabel: { ko: '{name} 아래로 이동', en: 'Move {name} down' },
  removeLabel: { ko: '{name} 삭제', en: 'Remove {name}' },

  assignTitle: { ko: '필드 담당자', en: 'Field owners' },
  assignSubtitle: {
    ko: '각 서명 필드를 어떤 받는 분이 작성할지 지정하세요.',
    en: 'Choose which recipient fills in each field.',
  },
  assignFieldMeta: { ko: '{field} 필드 · {page}페이지', en: '{field} field · page {page}' },
  assignSelectLabel: {
    ko: '{field} 필드 담당자 선택',
    en: 'Choose the owner of the {field} field',
  },
  recipientsEmptyTitle: { ko: '아직 받는 분이 없어요', en: 'No recipients yet' },
  recipientsEmptyBody: {
    ko: '서명을 받을 분을 추가해 주세요. 추가한 순서대로 서명 요청이 전달돼요.',
    en: 'Add the people who need to sign. Requests go out in the order you add them.',
  },

  // --- step: review & send ------------------------------------------------
  reviewTitle: { ko: '발송 전 확인해 주세요', en: 'Review before sending' },
  reviewSubhead: {
    ko: '아래 내용으로 서명 요청을 보낼게요. 맞는지 확인해 주세요.',
    en: 'This is what goes out. Check that it is right.',
  },
  sectionDocument: { ko: '계약 문서', en: 'Document' },
  sectionFields: { ko: '서명 필드', en: 'Signature fields' },
  sectionRecipients: { ko: '받는 분', en: 'Recipients' },
  untitledDocument: { ko: '제목 없는 계약', en: 'Untitled contract' },
  /** Meta-line segments and card counters — labelled stats, not counted nouns. */
  docFieldCount: { ko: '서명 필드 {count}개', en: 'Signature fields: {count}' },
  fieldsTotal: { ko: '전체 {count}개', en: 'Total: {count}' },
  fieldTypeCount: { ko: '{field} {count}개', en: '{field}: {count}' },
  recipientCount: { ko: '{count}명', en: '{count}' },

  send: { ko: '발송', en: 'Send' },
  sending: { ko: '발송 중', en: 'Sending' },
  /** Heading of the schedule toggle. */
  schedule: { ko: '예약 발송', en: 'Schedule send' },
  scheduleDescription: {
    ko: '원하는 날짜와 시간에 서명 요청을 보냅니다.',
    en: 'Send the signature request at a date and time you choose.',
  },
  scheduleDateTime: { ko: '발송 날짜와 시간', en: 'Send date and time' },
  scheduleHint: { ko: '현재 시각 이후로 설정해 주세요.', en: 'Pick a time in the future.' },
  scheduleRequired: {
    ko: '예약 발송 날짜와 시간을 설정해 주세요.',
    en: 'Set the date and time for the scheduled send.',
  },
  scheduleFuture: { ko: '현재 시각 이후로 설정해 주세요.', en: 'Pick a time in the future.' },
  /** Submit label once scheduling is switched on. */
  scheduledSend: { ko: '예약 발송', en: 'Schedule send' },
  scheduling: { ko: '예약 중', en: 'Scheduling' },

  sendSuccessTitle: { ko: '계약 발송이 완료되었습니다!', en: 'Your contract is on its way' },
  sendSuccessBody: {
    ko: '받는 분에게 서명 요청을 보냈어요. 진행 상황은 대시보드에서 확인할 수 있어요.',
    en: 'The signature request has been sent. Track its progress from the dashboard.',
  },
  scheduledSuccessTitle: { ko: '계약 발송을 예약했어요!', en: 'Your send is scheduled' },
  scheduledSuccessBody: {
    ko: '설정한 시간에 받는 분에게 서명 요청을 보낼게요. 진행 상황은 대시보드에서 확인할 수 있어요.',
    en: 'The signature request goes out at the time you set. Track its progress from the dashboard.',
  },
  toDashboard: { ko: '대시보드로 가기', en: 'Go to dashboard' },

  // --- step: share link ---------------------------------------------------
  linkTitle: { ko: '링크로 공유할게요', en: 'Share by link' },
  linkIntro: {
    ko: '유효 기간과 비밀번호를 정하면 공유 링크를 만들어 드려요.',
    en: 'Set a validity window and an optional password, and we will create the link.',
  },
  linkDone: {
    ko: '링크가 준비됐어요. 복사해서 받는 분에게 전달해 주세요.',
    en: 'The link is ready. Copy it and send it to your recipient.',
  },

  // --- save-as-template dialog --------------------------------------------
  saveTemplateDescription: {
    ko: '지금 배치한 필드 그대로 저장해 두면, 다음에 같은 양식을 바로 불러올 수 있어요.',
    en: 'Save the fields exactly as placed, and the same layout loads instantly next time.',
  },
  templateNameLabel: { ko: '템플릿 이름', en: 'Template name' },
  templateNamePlaceholder: { ko: '예: 표준 근로계약서', en: 'e.g. Standard employment contract' },
  templateNameHint: {
    ko: '나중에 목록에서 찾기 쉬운 이름을 붙여 주세요.',
    en: 'Pick a name that is easy to find in the list later.',
  },
  save: { ko: '저장', en: 'Save' },
  saving: { ko: '저장 중', en: 'Saving' },
  saveTemplateSuccessTitle: { ko: '템플릿을 저장했어요', en: 'Template saved' },
  saveTemplateSuccessBody: {
    ko: "다음에 '내 템플릿'에서 바로 불러올 수 있어요.",
    en: 'You can load it from My templates next time.',
  },
  confirm: { ko: '확인', en: 'Done' },
} as const satisfies WebTranslationDomain;
