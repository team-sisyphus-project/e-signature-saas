import { Logger } from '@nestjs/common';
import { DEFAULT_LOCALE, type SupportedLocale } from './locale-resolver';

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

/**
 * Every key a caller may ask `translate` for, as data.
 *
 * The list is the type's source, not its echo: `TranslationKey` is derived from
 * it, so a key exists for the compiler exactly when the coverage report can see
 * it. Kept as a list rather than derived from the `ko` catalog because the two
 * answer different questions — this is what callers are allowed to request, the
 * catalog is what has been written. A key declared here and written nowhere is
 * the defect the report exists to surface; deriving it from the catalog would
 * make that state unrepresentable and therefore invisible.
 *
 * Order follows the catalog, so a printed report reads in catalog order.
 */
export const TRANSLATION_KEYS = [
  'common.sender',
  'common.signer',
  'common.completed',
  'signing.invalidLink',
  'signing.codeMismatch',
  'signing.codeFormat',
  'signing.locked',
  'signing.sessionExpired',
  'signing.alreadySigned',
  'signing.notSignable',
  'signing.invalidFieldValue',
  'signing.fieldsIncomplete',
  'signing.artifactNotReady',
  'signing.completed',
  'share.invalidLink',
  'share.expired',
  'share.revoked',
  'share.passwordRequired',
  'share.wrongPassword',
  'share.locked',
  'share.sessionExpired',
  'share.notSignable',
  'share.alreadySubmitted',
  'share.submitted',
  'artifact.finalContract',
  'artifact.auditCertificate',
  'artifact.untitled',
  'completionEmail.subject',
  'completionEmail.headline',
  'completionEmail.bodyAllDone',
  'completionEmail.bodyAttachments',
  'completionEmail.bodySenderExtra',
  'completionEmail.finalContract',
  'completionEmail.finalContractNote',
  'completionEmail.auditCertificate',
  'completionEmail.auditCertificateNote',
  'completionEmail.ctaLabel',
  'completionEmail.footer',
  'completionEmail.serviceName',
  'completionEmail.sender',
  'completionEmail.logo',
  'completionEmail.attachments',
  'auditCertificate.title',
  'auditCertificate.senderFallback',
  'auditCertificate.issuedAt',
  'auditCertificate.certificateId',
  'auditCertificate.documentId',
  'auditCertificate.contractSummary',
  'auditCertificate.contractName',
  'auditCertificate.originalPages',
  'auditCertificate.originalPageCount',
  'auditCertificate.sender',
  'auditCertificate.senderEmail',
  'auditCertificate.sentAt',
  'auditCertificate.completedAt',
  'auditCertificate.timeZone',
  'auditCertificate.finalStatus',
  'auditCertificate.completed',
  'auditCertificate.participants',
  'auditCertificate.noParticipants',
  'auditCertificate.verification',
  'auditCertificate.verificationMethod',
  'auditCertificate.signedAt',
  'auditCertificate.unsigned',
  'auditCertificate.timeline',
  'auditCertificate.integrity',
  'auditCertificate.hashAlgorithm',
  'auditCertificate.certificateIssued',
  'auditCertificate.originalContract',
  'auditCertificate.finalContract',
  'auditCertificate.system',
  'auditCertificate.actionDocumentUploaded',
  'auditCertificate.actionContractSent',
  'auditCertificate.actionSignRequestViewed',
  'auditCertificate.actionSignRequestVerified',
  'auditCertificate.actionSignVerifyFailed',
  'auditCertificate.actionSignRequestSigned',
  'auditCertificate.actionDocumentCompleted',
  'auditCertificate.actionFallback',
] as const;

export type TranslationKey = (typeof TRANSLATION_KEYS)[number];

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

/** One locale's copy, as `scope.name` pairs. */
export type ServerTranslationCatalog = Readonly<
  Record<string, Readonly<Record<string, TranslationLeaf>>>
>;

/** Every published locale's catalog — the shape of `SERVER_TRANSLATIONS`. */
export type ServerTranslationCatalogs = Readonly<Record<SupportedLocale, ServerTranslationCatalog>>;

/**
 * Why a catalog has no copy for a key.
 *
 * The vocabulary is `MissingWebTranslationReason`'s in
 * `apps/web/src/lib/web-translations.ts`, minus the browser-only `placeholder`
 * case (server copy is interpolated by its callers, not here). One gap must be
 * named the same way on both halves, or the two reports cannot be read — or
 * merged — as one list.
 */
export type MissingServerTranslationReason = 'missing' | 'empty';

/**
 * What a catalog answers for one key: usable copy, or the reason there is none.
 *
 * Exported because `translate` and the coverage report must ask the *same*
 * question. Were the report to re-implement the read, it could call a key
 * covered that `translate` would still replace — a report that clears a gap the
 * reader is about to hit is worse than no report.
 */
export type CatalogRead =
  | { readonly copy: string; readonly gap?: undefined }
  | { readonly copy?: undefined; readonly gap: MissingServerTranslationReason };

/** This report retains keys and counters only, never user data or rendered copy. */
export interface MissingServerTranslationEntry {
  key: TranslationKey;
  /** Locale requested by the caller at the point the lookup failed. */
  requestedLocale: SupportedLocale;
  /** Catalog whose copy was actually served. */
  fallbackLocale: SupportedLocale;
  reason: MissingServerTranslationReason;
  /** How many times `translate` fell back for this exact tuple. */
  count: number;
}

export interface ServerTranslationFallbackReport {
  /** De-duplicated keys that fell back at least once — the missing-key list. */
  missingKeys: readonly TranslationKey[];
  /** Per-locale detail and occurrence counts for runtime diagnostics. */
  entries: readonly MissingServerTranslationEntry[];
}

const logger = new Logger('ServerTranslations');

/**
 * Gaps this process has actually served, keyed by locale/key/reason.
 *
 * It replaces the log-only set that used to live here. A log line proves a gap
 * to whoever is tailing the log at that moment; Spec M-6 asks for the missing
 * keys as a *list* something can read back, so the same record now answers both
 * — the map still gates the log to once per gap, and
 * `getServerTranslationFallbackReport()` hands out the list.
 *
 * Growth is bounded by the code paths that call `translate`: keys are literals
 * or come from closed mappings (`AUDIT_ACTION_LABEL`), never from user input,
 * so no request can make this map grow.
 */
const fallbacks = new Map<string, MissingServerTranslationEntry>();

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
function lookup(catalog: ServerTranslationCatalog | undefined, key: string): TranslationLeaf {
  const separator = key.indexOf('.');
  if (separator < 1 || separator === key.length - 1) return undefined;
  const scope = ownValue(catalog, key.slice(0, separator)) as
    | Readonly<Record<string, unknown>>
    | undefined;
  return ownValue(scope, key.slice(separator + 1)) as TranslationLeaf;
}

/**
 * The catalog's answer for one key.
 *
 * Blank copy is a gap, not a translation: it would render as an empty label,
 * which the reader cannot tell from a layout bug.
 */
export function readCatalog(
  catalog: ServerTranslationCatalog | undefined,
  key: string,
): CatalogRead {
  const value = lookup(catalog, key);
  if (typeof value !== 'string') return { gap: 'missing' };
  return value.trim() === '' ? { gap: 'empty' } : { copy: value };
}

/**
 * Record one served fallback, and log it the first time it is seen.
 *
 * A gap is a defect, so it is traceable — in the log and in the report, never
 * in the response.
 */
function reportGap(
  locale: SupportedLocale,
  key: TranslationKey,
  reason: MissingServerTranslationReason,
): void {
  // A NUL separator cannot occur inside a locale or a key, so two distinct
  // tuples can never collapse into one entry.
  const id = [locale, DEFAULT_LOCALE, key, reason].join('\u0000');
  const previous = fallbacks.get(id);
  if (previous) {
    previous.count += 1;
    return;
  }
  fallbacks.set(id, {
    key,
    requestedLocale: locale,
    fallbackLocale: DEFAULT_LOCALE,
    reason,
    count: 1,
  });
  logger.warn(`Missing "${locale}" translation for "${key}"; served the Korean fallback.`);
}

/**
 * Snapshot the keys this process replaced with Korean copy at runtime.
 *
 * The entries are copies: a diagnostics endpoint or a report writer cannot
 * edit the ledger by editing what it was handed.
 */
export function getServerTranslationFallbackReport(): ServerTranslationFallbackReport {
  const entries = [...fallbacks.values()].map((entry) => ({ ...entry }));
  return { missingKeys: [...new Set(entries.map((entry) => entry.key))], entries };
}

/**
 * Clear the ledger, for example after a report has been written out.
 *
 * This also re-arms the log: a gap already reported will warn once more the
 * next time it is served, which is what a fresh reporting window means.
 */
export function resetServerTranslationFallbackReport(): void {
  fallbacks.clear();
}

/**
 * Returns localized copy, Korean base copy, or a safe Korean placeholder.
 *
 * Server copy ends up in emails and in signed PDFs, where a thrown error loses
 * the whole artifact and a leaked `auditCertificate.title` is permanent. So an
 * unknown locale, an unknown scope, an unknown name and blank copy all degrade
 * one step at a time instead of failing: the caller always receives text a
 * reader can understand, and the gap is reported through the log and the
 * fallback report.
 */
export function translate(locale: SupportedLocale, key: TranslationKey): string {
  const catalogs: Readonly<Record<string, ServerTranslationCatalog>> = SERVER_TRANSLATIONS;
  const localized = readCatalog(catalogs[locale], key);
  if (localized.copy !== undefined) return localized.copy;

  reportGap(locale, key, localized.gap);
  return readCatalog(catalogs[DEFAULT_LOCALE], key).copy ?? UNKNOWN_SERVER_TRANSLATION_FALLBACK;
}
