'use client';

/**
 * SignerFlow — renders the screen for the current state-machine phase.
 *
 * Reads phase off the shared signer context and dispatches to the matching
 * screen. The five-phase happy path (loading → verify → viewing → signing →
 * done) plus the `blocked` branch are all covered here. `viewing` / `signing`
 * render the shared document viewer; `done` the shared completion screen — both
 * read the OTP flow's projection through the FillProvider mounted by
 * `SignerProvider`.
 */

import * as React from 'react';
import { useTranslation } from '@/components/locale-provider';
import type { WebTranslationKey } from '@/lib/web-translations';
import { useSigner, type BlockReason } from './signer-context';
import { LoadingScreen } from './loading-screen';
import { VerifyScreen } from './verify-screen';
import { NoticeScreen, type NoticeScreenProps } from './notice-screen';
import { DocumentViewer } from './document-viewer';
import { CompletionScreen } from './completion-screen';

/**
 * Terminal copy + tone for each non-signable reason (calm voice, no blame).
 *
 * Catalog keys rather than sentences, so a signer who switches language while
 * standing on a dead-end screen reads the new one.
 */
const NOTICE: Record<
  BlockReason,
  { titleKey: WebTranslationKey; bodyKey: WebTranslationKey; tone: NoticeScreenProps['tone'] }
> = {
  alreadySigned: {
    titleKey: 'signer.noticeSignedTitle',
    bodyKey: 'signer.noticeSignedBody',
    tone: 'success',
  },
  unavailable: {
    titleKey: 'signer.noticeUnavailableTitle',
    bodyKey: 'signer.noticeUnavailableBody',
    tone: 'neutral',
  },
  invalidLink: {
    titleKey: 'signer.noticeInvalidLinkTitle',
    bodyKey: 'signer.noticeInvalidLinkBody',
    tone: 'neutral',
  },
};

export function SignerFlow() {
  const { state } = useSigner();
  const t = useTranslation();

  switch (state.phase) {
    case 'loading':
      return <LoadingScreen />;
    case 'verify':
      // Meta is guaranteed present once we leave loading for verify.
      return state.meta ? <VerifyScreen meta={state.meta} /> : <LoadingScreen />;
    case 'blocked': {
      const notice = NOTICE[state.blockReason ?? 'invalidLink'];
      return (
        <NoticeScreen
          title={t(notice.titleKey)}
          body={t(notice.bodyKey)}
          tone={notice.tone}
          sender={state.meta?.sender ?? null}
          brandColor={state.meta?.sender.brandColor ?? null}
        />
      );
    }
    case 'viewing':
    case 'signing':
      return state.meta ? <DocumentViewer /> : <LoadingScreen />;
    case 'done':
      return state.meta ? <CompletionScreen /> : <LoadingScreen />;
    default:
      return <LoadingScreen />;
  }
}
