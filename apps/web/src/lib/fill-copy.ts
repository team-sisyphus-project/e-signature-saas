/**
 * Copy contract for the shared fill surface, as catalog keys.
 *
 * The OTP signer flow (`/sign/[token]`) and the link-share recipient flow
 * (`/share/[token]`) render the same document viewer, capture sheet and
 * completion takeover. They differ only in a handful of words: a signer
 * "서명"s, a recipient "작성/제출"s. Each flow therefore hands the shared
 * components a {@link FillCopy} — a map of catalog keys, not sentences — and the
 * render site resolves it with the locale it already holds. A key survives a
 * language switch mid-flow; a resolved sentence stranded in a context value
 * would not.
 *
 * Keys that describe the *surface* rather than the audience (page chrome, field
 * affordances, the whole capture sheet) live in the `signer` domain and are
 * borrowed here by the share flow. Copying them into `share` would put one
 * rendered string in two catalogs, which is the drift the catalog exists to
 * prevent; the borrow is explicit and lives in exactly this file, so a
 * translator changing "Sign here" can see both readers of it at once.
 *
 * This module is deliberately plain TypeScript rather than part of
 * `components/signer/fill-context.tsx`: it lets the whole contract be resolved
 * in both locales by a unit test without mounting a single component.
 */

import type { SignFieldType } from './signing';
import type { WebTranslationKey } from './web-translations';

/** Capture-sheet chrome: titles, mode toggle, hints, inputs, apply/close. */
export interface SheetCopy {
  /** Sheet title, by field type. */
  title: Record<SignFieldType, WebTranslationKey>;
  /** Inline hint under the sheet title, by field type. */
  hint: Record<SignFieldType, WebTranslationKey>;
  modeDraw: WebTranslationKey;
  modeType: WebTranslationKey;
  modeLabel: WebTranslationKey;
  padLabel: WebTranslationKey;
  /** Label of the name input in typed mode ("enter a name, pick a font"). */
  typeHint: WebTranslationKey;
  typePlaceholder: WebTranslationKey;
  fontLabel: WebTranslationKey;
  dateLabel: WebTranslationKey;
  textLabel: WebTranslationKey;
  textPlaceholder: WebTranslationKey;
  reset: WebTranslationKey;
  apply: WebTranslationKey;
  close: WebTranslationKey;
  saveError: WebTranslationKey;
}

/** Completion takeover chrome. */
export interface DoneCopy {
  title: WebTranslationKey;
  body: WebTranslationKey;
  documentLabel: WebTranslationKey;
  /** Next-step note when the whole document is now complete. */
  nextAllDone: WebTranslationKey;
  /** Next-step note when other participants are still pending. */
  nextWaiting: WebTranslationKey;
}

/** Everything the shared reading / filling / completion screens render. */
export interface FillCopy {
  /** Bottom CTA when unfilled fields remain (jumps to the next one). */
  ctaContinue: WebTranslationKey;
  /** Bottom CTA when every field is captured (finalizes). */
  ctaComplete: WebTranslationKey;
  /** Whole-document load failure. */
  loadError: WebTranslationKey;
  /** Per-page rasterize failure. Takes a `{page}` slot. */
  pageError: WebTranslationKey;
  /** Progress line. Takes `{total}` and `{done}` slots. */
  progress: WebTranslationKey;
  /** Progress line when there are no fields to fill. */
  progressNone: WebTranslationKey;
  /** Progress line when every field is done. */
  progressAllDone: WebTranslationKey;
  /** "Tap here" affordance on an unfilled field, by type. */
  fieldAffordance: Record<SignFieldType, WebTranslationKey>;
  /** Finalize-CTA failure fallback (when the server gives none). */
  completeError: WebTranslationKey;
  sheet: SheetCopy;
  done: DoneCopy;
}

/**
 * The capture sheet reads identically to both audiences — the same box, the
 * same ink, the same fonts — apart from the DATE/TEXT hints, which name what
 * the reader is being asked for. Each flow overrides just those two.
 */
const SHARED_SHEET = {
  title: {
    SIGNATURE: 'signer.sheetTitleSignature',
    DATE: 'signer.sheetTitleDate',
    TEXT: 'signer.sheetTitleText',
  },
  modeDraw: 'signer.sheetModeDraw',
  modeType: 'signer.sheetModeType',
  modeLabel: 'signer.sheetModeLabel',
  padLabel: 'signer.sheetPadLabel',
  typeHint: 'signer.sheetTypeHint',
  typePlaceholder: 'signer.sheetTypePlaceholder',
  fontLabel: 'signer.sheetFontLabel',
  dateLabel: 'signer.sheetDateLabel',
  textLabel: 'signer.sheetTextLabel',
  textPlaceholder: 'signer.sheetTextPlaceholder',
  reset: 'signer.sheetReset',
  apply: 'signer.sheetApply',
  close: 'signer.sheetClose',
  saveError: 'signer.sheetSaveError',
} as const satisfies Omit<SheetCopy, 'hint'>;

/** The shared affordance: what a tap on an empty box will let you do. */
const SHARED_AFFORDANCE = {
  SIGNATURE: 'signer.fieldAffordanceSignature',
  DATE: 'signer.fieldAffordanceDate',
  TEXT: 'signer.fieldAffordanceText',
} as const satisfies Record<SignFieldType, WebTranslationKey>;

/** The OTP signer flow's copy for the shared fill surface (speaks "서명"). */
export const SIGNER_FILL_COPY: FillCopy = {
  ctaContinue: 'signer.viewerCtaContinue',
  ctaComplete: 'signer.viewerCtaComplete',
  loadError: 'signer.viewerLoadError',
  pageError: 'signer.viewerPageError',
  progress: 'signer.viewerProgress',
  progressNone: 'signer.viewerProgressNone',
  progressAllDone: 'signer.viewerProgressAllDone',
  fieldAffordance: SHARED_AFFORDANCE,
  completeError: 'signer.completeError',
  sheet: {
    ...SHARED_SHEET,
    hint: {
      SIGNATURE: 'signer.sheetDrawHint',
      DATE: 'signer.sheetDateHint',
      TEXT: 'signer.sheetTextHint',
    },
  },
  done: {
    title: 'signer.doneTitle',
    body: 'signer.doneBody',
    documentLabel: 'signer.doneDocumentLabel',
    nextAllDone: 'signer.doneNextAllDone',
    nextWaiting: 'signer.doneNextWaiting',
  },
};

/** The link-share recipient flow's copy (speaks "작성/제출"). */
export const SHARE_FILL_COPY: FillCopy = {
  ctaContinue: 'share.viewerCtaContinue',
  ctaComplete: 'share.viewerCtaComplete',
  // The document and its pages fail the same way for either audience.
  loadError: 'signer.viewerLoadError',
  pageError: 'signer.viewerPageError',
  progress: 'share.viewerProgress',
  progressNone: 'share.viewerProgressNone',
  progressAllDone: 'signer.viewerProgressAllDone',
  fieldAffordance: SHARED_AFFORDANCE,
  completeError: 'share.viewerCompleteError',
  sheet: {
    ...SHARED_SHEET,
    hint: {
      SIGNATURE: 'signer.sheetDrawHint',
      DATE: 'share.sheetDateHint',
      TEXT: 'share.sheetTextHint',
    },
  },
  done: {
    title: 'share.doneTitle',
    body: 'share.doneBody',
    documentLabel: 'share.doneDocumentLabel',
    // A share submission says the same thing either way: nothing is owed back.
    nextAllDone: 'share.doneNext',
    nextWaiting: 'share.doneNext',
  },
};
