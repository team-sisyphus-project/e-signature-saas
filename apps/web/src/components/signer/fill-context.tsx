'use client';

/**
 * Fill flow — the flow-agnostic contract the document-reading + field-capture +
 * completion surfaces bind to.
 *
 * The OTP signer flow (`/sign/[token]`) and the link-share recipient flow
 * (`/share/[token]`) render the *same* heavy presentational components
 * (`document-viewer`, `signature-sheet`, `completion-screen`). Those screens
 * differ only in their access gate, their API endpoints, and a little copy — the
 * reading/filling/finalize experience is identical. Rather than fork them, each
 * flow builds a {@link FillContextValue} adapter and wraps the screens in a
 * {@link FillProvider}: the components consume `useFill()` and never reach for a
 * flow-specific context or API client directly.
 *
 * This is the flow-parameterization boundary — the signer state machine
 * (`signer-context`) keeps owning the OTP path; the share state machine
 * (`share-context`) owns the password path; both project onto this one surface.
 */

import * as React from 'react';
import type { SignFieldType } from '@/lib/signing';
import type { CompletionArtifact } from '@/lib/completion-download';
import type { SenderBranding } from '@/lib/signing';
import type { DoneCopy, FillCopy, SheetCopy } from '@/lib/fill-copy';

/**
 * Flow-specific copy for the shared screens, as catalog keys. The OTP flow
 * speaks "서명"; the share flow speaks "작성/제출". Both key maps live in
 * `lib/fill-copy.ts`, where they can be resolved in every locale without
 * mounting a component; the screens below stay audience-neutral.
 */
export type { DoneCopy, FillCopy, SheetCopy };

/**
 * A value the recipient has captured for one field, reflected inline on the page
 * by the viewer. Shared verbatim by both flows (the capture UI is identical).
 */
export type FillFieldValue =
  | { type: 'SIGNATURE'; /** Captured signature as a PNG data URL. */ dataUrl: string }
  | { type: 'TEXT'; text: string; /** Optional chosen signature font. */ fontFamily?: string }
  | { type: 'DATE'; text: string };

/** One assigned field with normalized (0..1) geometry — the viewer's overlay unit. */
export interface FillField {
  id: string;
  type: SignFieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Already has a server-persisted value (a resumed session). */
  filled: boolean;
}

/** The recipient's working set: document title + assigned fields. */
export interface FillPayload {
  documentTitle: string;
  pageCount: number;
  fields: FillField[];
}

/** Optional completed-artifact download (OTP only; the share flow omits it). */
export interface FillDownload {
  onDownload: (kind: CompletionArtifact) => Promise<void>;
}

/**
 * Everything the shared reading/filling/completion screens need, projected from
 * whichever flow state machine owns the session.
 */
export interface FillContextValue {
  /** Sender identity for the branding header (no locale: see `SenderBranding`). */
  sender: SenderBranding;
  /** Sender brand color for the `brandStyle()` hook (re-skins the subtree). */
  brandColor: string | null;
  /** Document title fallback (when the payload hasn't resolved yet). */
  documentTitle: string;
  /** The recipient's working set; null until the access gate is cleared. */
  payload: FillPayload | null;
  /** Captured values per field id; the viewer reflects these inline. */
  fieldValues: Record<string, FillFieldValue>;
  /** The field whose capture sheet is open (drives the BottomSheet target). */
  activeFieldId: string | null;
  /** True once finalize reports the whole document is complete. */
  documentCompleted: boolean;
  /** Absolute URL of the session-guarded PDF byte stream. */
  pdfUrl: string;
  /** Read the bearer session token for the guarded PDF / save calls. */
  loadSession: () => string | null;
  /** Persist captured field values to this flow's `fields` endpoint. */
  persistFields: (fields: { fieldId: string; value: string }[]) => Promise<void>;
  /** Open the capture sheet targeting a field. */
  openField: (fieldId: string) => void;
  /** Dismiss the capture sheet without changing any value. */
  closeField: () => void;
  /** Record a captured value for a field; the viewer reflects it inline. */
  setFieldValue: (fieldId: string, value: FillFieldValue) => void;
  /** Finalize the recipient's part (complete / submit), advancing to `done`. */
  complete: () => Promise<void>;
  /** Flow-specific copy keys for the shared screens. */
  copy: FillCopy;
  /** Present ⇒ the completion screen shows a download area (OTP only). */
  download?: FillDownload;
}

const FillContext = React.createContext<FillContextValue | null>(null);

export function FillProvider({
  value,
  children,
}: {
  value: FillContextValue;
  children: React.ReactNode;
}) {
  return <FillContext.Provider value={value}>{children}</FillContext.Provider>;
}

export function useFill(): FillContextValue {
  const ctx = React.useContext(FillContext);
  if (!ctx) throw new Error('useFill must be used within a FillProvider');
  return ctx;
}
