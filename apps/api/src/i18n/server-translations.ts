import { Logger } from '@nestjs/common';
import type { SupportedLocale } from './locale-resolver';

/** Server-owned copy. New server-facing strings belong here, not in services. */
export const SERVER_TRANSLATIONS = {
  ko: {
    common: { sender: '발신자', signer: '서명자', completed: '완료되었습니다.' },
    /**
     * Every message an anonymous signer can receive. The Korean wording is the
     * `MESSAGES.signing` copy verbatim: this scope replaces that owner-facing
     * constant on the public routes, and a Korean visitor must not notice the
     * hand-off.
     */
    signing: {
      invalidLink: '서명 링크가 올바르지 않아요. 발신자에게 링크를 다시 요청해 주세요.',
      codeMismatch: '인증 코드가 일치하지 않아요. 다시 확인해 주세요.',
      codeFormat: '6자리 인증 코드를 정확히 입력해 주세요.',
      locked: '인증을 여러 번 실패했어요. 잠시 후 다시 시도해 주세요.',
      sessionExpired: '본인확인 후 시간이 지났어요. 인증 코드를 다시 입력해 주세요.',
      alreadySigned: '이미 서명을 완료한 계약이에요.',
      notSignable: '더 이상 서명할 수 없는 계약이에요. 발신자에게 문의해 주세요.',
      invalidFieldValue: '입력한 값을 다시 확인해 주세요.',
      fieldsIncomplete: '아직 작성하지 않은 항목이 있어요. 모두 채운 뒤 완료해 주세요.',
      artifactNotReady: '완료 문서가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.',
      completed: '서명이 완료되었습니다!',
    },
    /** Every message an anonymous share-link recipient can receive. */
    share: {
      invalidLink: '링크가 올바르지 않아요. 보낸 분에게 링크를 다시 요청해 주세요.',
      expired: '이 링크는 유효 기간이 지났어요. 보낸 분에게 새 링크를 요청해 주세요.',
      revoked: '보낸 분이 이 링크를 사용 중지했어요. 보낸 분에게 문의해 주세요.',
      passwordRequired: '비밀번호를 입력해 주세요.',
      wrongPassword: '비밀번호가 일치하지 않아요. 다시 확인해 주세요.',
      locked: '비밀번호를 여러 번 잘못 입력했어요. 잠시 후 다시 시도해 주세요.',
      sessionExpired: '접속 시간이 만료됐어요. 링크를 다시 열어 주세요.',
      notSignable: '지금은 작성할 수 없는 계약이에요. 보낸 분에게 문의해 주세요.',
      alreadySubmitted: '이미 제출을 완료한 계약이에요.',
      submitted: '제출이 완료되었습니다!',
    },
    /**
     * Names that reach the reader as a *filename* — in their mail client's
     * attachment list and on their disk after download. Kept apart from
     * `completionEmail.*`, which is body copy: body copy may grow a verb or an
     * article, a filename may not.
     */
    artifact: {
      finalContract: '최종 계약서',
      auditCertificate: '감사 추적 인증서',
      untitled: '계약서',
    },
    completionEmail: {
      subject: '[{title}] 계약이 모두 완료되었어요',
      headline: '계약이 모두 완료되었어요',
      bodyAllDone: '{title} 계약의 모든 서명이 끝났어요.',
      bodyAttachments:
        '최종 계약서와 감사 추적 인증서를 함께 보내 드려요. 첨부 파일에서 확인하실 수 있어요.',
      bodySenderExtra: '대시보드에서도 언제든 다시 내려받을 수 있어요.',
      finalContract: '최종 계약서',
      finalContractNote: '서명이 모두 담긴 완료본이에요.',
      auditCertificate: '감사 추적 인증서',
      auditCertificateNote: '계약 진행 이력과 문서 무결성을 증명하는 문서예요.',
      ctaLabel: '대시보드에서 보기',
      footer: '이 메일은 계약 완료에 따라 자동으로 발송되었어요.',
      serviceName: '전자계약',
      sender: '발신자',
      logo: '로고',
      attachments: '첨부',
    },
    auditCertificate: {
      title: '감사 추적 인증서',
      senderFallback: '발신자',
      issuedAt: '발급 일시',
      certificateId: '인증서 고유 ID',
      documentId: '대상 문서 ID',
      contractSummary: '계약 요약',
      contractName: '계약명',
      /** Row label. Its value is the `originalPageCount` template — the two
       *  are never interchangeable: a label that still holds `{count}` is a
       *  defect the reader sees. */
      originalPages: '원본 쪽수',
      originalPageCount: '{count}쪽',
      sender: '발신자',
      senderEmail: '발신자 이메일',
      sentAt: '발송 일시',
      completedAt: '완료 일시',
      /** Zone shown beside every certificate timestamp — the clock itself is
       *  always KST, so this names it rather than converting it. */
      timeZone: 'KST',
      finalStatus: '최종 상태',
      completed: '완료됨',
      participants: '참여자',
      noParticipants: '등록된 서명자가 없어요.',
      verification: '본인확인',
      verificationMethod: '6자리 인증코드',
      signedAt: '서명 완료',
      unsigned: '서명 전',
      timeline: '이벤트 타임라인',
      integrity: '문서 무결성 지문',
      hashAlgorithm: '해시 알고리즘',
      certificateIssued: '인증서 발급',
      originalContract: '원본 계약서',
      finalContract: '최종 계약서',
      system: '시스템',
      actionDocumentUploaded: '업로드됨',
      actionContractSent: '발송됨',
      actionSignRequestViewed: '열람함',
      actionSignRequestVerified: '본인확인 완료',
      actionSignVerifyFailed: '본인확인 실패',
      actionSignRequestSigned: '서명 완료',
      actionDocumentCompleted: '계약 완료',
      actionFallback: '기타 활동',
    },
  },
  en: {
    common: { sender: 'Sender', signer: 'Signer', completed: 'Completed.' },
    signing: {
      invalidLink: 'This signing link is invalid. Ask the sender for a new link.',
      codeMismatch: 'That verification code is incorrect. Check it and try again.',
      codeFormat: 'Enter the 6-digit verification code.',
      locked: 'Too many failed attempts. Try again in a few minutes.',
      sessionExpired: 'Your session has expired. Enter the verification code again.',
      alreadySigned: 'You have already signed this contract.',
      notSignable: 'This contract can no longer be signed. Contact the sender.',
      invalidFieldValue: 'Check the value you entered.',
      fieldsIncomplete: 'Some fields are still empty. Fill them all in to finish.',
      artifactNotReady: 'The completed documents are not ready yet. Try again in a moment.',
      completed: 'Signing is complete!',
    },
    share: {
      invalidLink: 'This link is invalid. Ask the sender for a new link.',
      expired: 'This link has expired. Ask the sender for a new one.',
      revoked: 'The sender turned this link off. Contact the sender.',
      passwordRequired: 'Enter the password.',
      wrongPassword: 'That password is incorrect. Check it and try again.',
      locked: 'Too many incorrect passwords. Try again in a few minutes.',
      sessionExpired: 'Your session has expired. Open the link again.',
      notSignable: 'This contract cannot be filled in right now. Contact the sender.',
      alreadySubmitted: 'You have already submitted this contract.',
      submitted: 'Submission is complete!',
    },
    artifact: {
      finalContract: 'Final Contract',
      auditCertificate: 'Audit Trail Certificate',
      untitled: 'Contract',
    },
    completionEmail: {
      subject: '[{title}] Contract completed',
      headline: 'Your contract is complete',
      bodyAllDone: 'All signatures for {title} are complete.',
      bodyAttachments:
        'Your final contract and audit trail certificate are attached for your records.',
      bodySenderExtra: 'You can download them again anytime from your dashboard.',
      finalContract: 'Final contract',
      finalContractNote: 'The completed document containing all signatures.',
      auditCertificate: 'Audit trail certificate',
      auditCertificateNote: 'A record of the contract history and document integrity.',
      ctaLabel: 'View dashboard',
      footer: 'This email was sent automatically because the contract was completed.',
      serviceName: 'eContract',
      sender: 'Sender',
      logo: 'logo',
      attachments: 'Attachments',
    },
    auditCertificate: {
      title: 'Audit Trail Certificate',
      senderFallback: 'Sender',
      issuedAt: 'Issued at',
      certificateId: 'Certificate ID',
      documentId: 'Document ID',
      contractSummary: 'Contract summary',
      contractName: 'Contract name',
      originalPages: 'Original pages',
      originalPageCount: '{count} pages',
      sender: 'Sender',
      senderEmail: 'Sender email',
      sentAt: 'Sent at',
      completedAt: 'Completed at',
      timeZone: 'KST, UTC+9',
      finalStatus: 'Final status',
      completed: 'Completed',
      participants: 'Participants',
      noParticipants: 'There are no registered signers.',
      verification: 'Identity verification',
      verificationMethod: '6-digit verification code',
      signedAt: 'Signed at',
      unsigned: 'Not signed',
      timeline: 'Event timeline',
      integrity: 'Document integrity fingerprint',
      hashAlgorithm: 'Hash algorithm',
      certificateIssued: 'Certificate issued',
      originalContract: 'Original contract',
      finalContract: 'Final contract',
      system: 'System',
      actionDocumentUploaded: 'Document uploaded',
      actionContractSent: 'Contract sent',
      actionSignRequestViewed: 'Signing request viewed',
      actionSignRequestVerified: 'Identity verified',
      actionSignVerifyFailed: 'Identity verification failed',
      actionSignRequestSigned: 'Signing completed',
      actionDocumentCompleted: 'Contract completed',
      actionFallback: 'Other activity',
    },
  },
} as const;

export type TranslationKey =
  | 'common.sender'
  | 'common.signer'
  | 'common.completed'
  | 'signing.invalidLink'
  | 'signing.codeMismatch'
  | 'signing.codeFormat'
  | 'signing.locked'
  | 'signing.sessionExpired'
  | 'signing.alreadySigned'
  | 'signing.notSignable'
  | 'signing.invalidFieldValue'
  | 'signing.fieldsIncomplete'
  | 'signing.artifactNotReady'
  | 'signing.completed'
  | 'share.invalidLink'
  | 'share.expired'
  | 'share.revoked'
  | 'share.passwordRequired'
  | 'share.wrongPassword'
  | 'share.locked'
  | 'share.sessionExpired'
  | 'share.notSignable'
  | 'share.alreadySubmitted'
  | 'share.submitted'
  | 'artifact.finalContract'
  | 'artifact.auditCertificate'
  | 'artifact.untitled'
  | 'completionEmail.subject'
  | 'completionEmail.headline'
  | 'completionEmail.bodyAllDone'
  | 'completionEmail.bodyAttachments'
  | 'completionEmail.bodySenderExtra'
  | 'completionEmail.finalContract'
  | 'completionEmail.finalContractNote'
  | 'completionEmail.auditCertificate'
  | 'completionEmail.auditCertificateNote'
  | 'completionEmail.ctaLabel'
  | 'completionEmail.footer'
  | 'completionEmail.serviceName'
  | 'completionEmail.sender'
  | 'completionEmail.logo'
  | 'completionEmail.attachments'
  | 'auditCertificate.title'
  | 'auditCertificate.senderFallback'
  | 'auditCertificate.issuedAt'
  | 'auditCertificate.certificateId'
  | 'auditCertificate.documentId'
  | 'auditCertificate.contractSummary'
  | 'auditCertificate.contractName'
  | 'auditCertificate.originalPages'
  | 'auditCertificate.originalPageCount'
  | 'auditCertificate.sender'
  | 'auditCertificate.senderEmail'
  | 'auditCertificate.sentAt'
  | 'auditCertificate.completedAt'
  | 'auditCertificate.timeZone'
  | 'auditCertificate.finalStatus'
  | 'auditCertificate.completed'
  | 'auditCertificate.participants'
  | 'auditCertificate.noParticipants'
  | 'auditCertificate.verification'
  | 'auditCertificate.verificationMethod'
  | 'auditCertificate.signedAt'
  | 'auditCertificate.unsigned'
  | 'auditCertificate.timeline'
  | 'auditCertificate.integrity'
  | 'auditCertificate.hashAlgorithm'
  | 'auditCertificate.certificateIssued'
  | 'auditCertificate.originalContract'
  | 'auditCertificate.finalContract'
  | 'auditCertificate.system'
  | 'auditCertificate.actionDocumentUploaded'
  | 'auditCertificate.actionContractSent'
  | 'auditCertificate.actionSignRequestViewed'
  | 'auditCertificate.actionSignRequestVerified'
  | 'auditCertificate.actionSignVerifyFailed'
  | 'auditCertificate.actionSignRequestSigned'
  | 'auditCertificate.actionDocumentCompleted'
  | 'auditCertificate.actionFallback';

/**
 * Last-resort Korean text served when even the Korean base catalog has no copy
 * for a key.
 *
 * The wording is deliberately identical to `UNKNOWN_WEB_TRANSLATION_FALLBACK`
 * in `apps/web/src/lib/web-translations.ts`: the same gap must read the same way
 * whether the reader hits it on a screen or in an emailed artifact. It states
 * that copy is pending, names no key, and reveals nothing about the catalog.
 */
export const UNKNOWN_SERVER_TRANSLATION_FALLBACK = '내용을 준비하고 있습니다.';

/** A catalog value may be absent or blank once catalogs drift out of sync. */
type TranslationLeaf = string | null | undefined;
type ServerCatalog = Readonly<Record<string, Readonly<Record<string, TranslationLeaf>>>>;

const logger = new Logger('ServerTranslations');
/** Keys already reported, so a gap on a hot path cannot flood the log. */
const reportedGaps = new Set<string>();

/**
 * Own-property read. Plain object literals inherit from `Object.prototype`, so
 * an unguarded index would answer `'constructor.name'` with `'Object'` and pass
 * it off as translated copy. Only copy the catalog itself declares counts.
 */
function ownValue(record: Readonly<Record<string, unknown>> | undefined, name: string): unknown {
  if (!record || !Object.prototype.hasOwnProperty.call(record, name)) return undefined;
  return record[name];
}

/**
 * Read one catalog leaf, treating an unknown scope, an unknown name and a
 * malformed key (`''`, `'noscope'`, `'scope.'`) alike as "no value".
 *
 * Splitting on the first separator only keeps names containing a dot readable.
 */
function lookup(catalog: ServerCatalog | undefined, key: string): TranslationLeaf {
  const separator = key.indexOf('.');
  if (separator < 1 || separator === key.length - 1) return undefined;
  const scope = ownValue(catalog, key.slice(0, separator)) as
    | Readonly<Record<string, unknown>>
    | undefined;
  return ownValue(scope, key.slice(separator + 1)) as TranslationLeaf;
}

/** Blank copy is a gap, not a translation: it would render as an empty label. */
function isUsable(value: TranslationLeaf): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** A gap is a defect, so it is traceable in the log — never in the response. */
function reportGap(locale: string, key: string): void {
  const id = `${locale}\u0000${key}`;
  if (reportedGaps.has(id)) return;
  reportedGaps.add(id);
  logger.warn(`Missing "${locale}" translation for "${key}"; served the Korean fallback.`);
}

/**
 * Returns localized copy, Korean base copy, or a safe Korean placeholder.
 *
 * Server copy ends up in emails and in signed PDFs, where a thrown error loses
 * the whole artifact and a leaked `auditCertificate.title` is permanent. So an
 * unknown locale, an unknown scope, an unknown name and blank copy all degrade
 * one step at a time instead of failing: the caller always receives text a
 * reader can understand, and the gap is reported through the log.
 */
export function translate(locale: SupportedLocale, key: TranslationKey): string {
  const catalogs: Readonly<Record<string, ServerCatalog>> = SERVER_TRANSLATIONS;
  const localized = lookup(catalogs[locale], key);
  if (isUsable(localized)) return localized;

  reportGap(locale, key);
  const korean = lookup(catalogs.ko, key);
  return isUsable(korean) ? korean : UNKNOWN_SERVER_TRANSLATION_FALLBACK;
}
