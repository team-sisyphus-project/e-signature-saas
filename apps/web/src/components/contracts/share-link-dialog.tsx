'use client';

/**
 * ShareLinkDialog — the share-link settings modal (design-spec
 * `components/share-link-dialog/base.md`, copy `messaging/contract-detail-copy.md`).
 *
 * One modal, one task: the sender picks access settings (one validity window +
 * an optional password), generates a unique open/fill link, then copies it — all
 * on the same surface. The settings/generate/result flow lives in the shared
 * `ShareLinkBody`; this container only wraps it in `@repo/ui` Dialog (focus trap,
 * scroll lock, Esc/overlay dismiss, accessible title/description). The same body
 * is reused by the create wizard's link step, so the two entry points stay in
 * lockstep.
 *
 * Security: the password lives only in the body's state and the create request
 * body. It is never persisted, logged, or rendered after generation — the server
 * returns only `requiresPassword`.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { useTranslation } from '@/components/locale-provider';
import { ShareLinkBody } from './share-link-body';

export interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The contract these links belong to. */
  documentId: string;
  documentTitle: string;
  /** Invoked after a link is successfully created, so the list can refresh. */
  onCreated?: () => void;
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  documentId,
  onCreated,
}: ShareLinkDialogProps) {
  const t = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('contracts.linkDialogTitle')}</DialogTitle>
          <DialogDescription>{t('contracts.linkDialogDescription')}</DialogDescription>
        </DialogHeader>

        {/* Remount the body each time the modal opens so it starts at the
            configuring phase with fresh, empty fields (no stale password). */}
        {open ? <ShareLinkBody documentId={documentId} onCreated={onCreated} /> : null}
      </DialogContent>
    </Dialog>
  );
}
