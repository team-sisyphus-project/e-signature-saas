'use client';

/**
 * SaveTemplateDialog — name-and-save the wizard's current PDF + field layout as
 * a reusable template (design-spec `components/save-template-dialog/base.md`,
 * copy `messaging/save-template.md`).
 *
 * One modal, one task: the sender types a name and saves. The dialog reads the
 * wizard's placement state (storageKey · pageCount · fields) but never mutates
 * it — saving a template is a side-branch off the send flow, so the fields and
 * the in-progress draft are left exactly as they were.
 *
 * State machine: idle → saving → (success | error). On success the form is
 * replaced by a confirmation so the sender gets unambiguous feedback before the
 * modal closes; on failure the server's copy surfaces verbatim (e.g. the
 * plan's template limit — 'You have reached the number of templates …') and the sender can retry.
 * A 401 means the session lapsed, so we bounce to /login like the send flow.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  SuccessCheck,
} from '@repo/ui';
import { ApiError, GENERIC_ERROR } from '@/lib/api';
import { createTemplate } from '@/lib/templates';
import type { SignFieldDraft } from './wizard-context';

const COPY = {
  title: 'Save as template',
  description: 'Save the fields exactly as you placed them, and you can reuse the same layout next time.',
  nameLabel: 'Template name',
  namePlaceholder: 'e.g. Standard employment contract',
  nameHint: 'Choose a name that will be easy to find in your list later.',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving',
  retry: 'Try again',
  successTitle: 'Template saved',
  successBody: "You can load it right away from 'My templates' next time.",
  successClose: 'OK',
} as const;

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Storage key of the already-uploaded source PDF (reused when sending). */
  storageKey: string;
  /** Page count of the source PDF; omitted when not yet known. */
  pageCount?: number;
  /** The wizard's current placed fields, saved verbatim into the template. */
  fields: SignFieldDraft[];
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  storageKey,
  pageCount,
  fields,
}: SaveTemplateDialogProps) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [status, setStatus] = React.useState<SaveState>('idle');
  const [error, setError] = React.useState<string | null>(null);

  // Reset to a clean form whenever the modal (re)opens, so a prior name/error
  // never leaks into the next save.
  React.useEffect(() => {
    if (open) {
      setName('');
      setStatus('idle');
      setError(null);
    }
  }, [open]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && status !== 'saving';

  const handleSave = React.useCallback(async () => {
    if (trimmed.length === 0) return;
    setStatus('saving');
    setError(null);
    try {
      await createTemplate({ name: trimmed, storageKey, pageCount, fields });
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR);
      setStatus('error');
    }
  }, [trimmed, storageKey, pageCount, fields, router]);

  const inputId = 'save-template-name';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-md py-sm text-center">
            <SuccessCheck size={72} aria-label={COPY.successTitle} />
            <DialogHeader className="items-center pb-0">
              <DialogTitle>{COPY.successTitle}</DialogTitle>
              <DialogDescription>{COPY.successBody}</DialogDescription>
            </DialogHeader>
            <Button size="md" fullWidth onClick={() => onOpenChange(false)}>
              {COPY.successClose}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{COPY.title}</DialogTitle>
              <DialogDescription>{COPY.description}</DialogDescription>
            </DialogHeader>

            <Field label={COPY.nameLabel} htmlFor={inputId} hint={COPY.nameHint}>
              <Input
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={COPY.namePlaceholder}
                maxLength={80}
                autoFocus
                disabled={status === 'saving'}
              />
            </Field>

            {status === 'error' && error ? (
              <p
                role="alert"
                className="mt-md rounded-md border border-danger/30 bg-danger-subtle px-md py-sm text-sm font-medium text-danger"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={status === 'saving'}
              >
                {COPY.cancel}
              </Button>
              <Button type="submit" disabled={!canSave} isLoading={status === 'saving'}>
                {status === 'saving'
                  ? COPY.saving
                  : status === 'error'
                    ? COPY.retry
                    : COPY.save}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
