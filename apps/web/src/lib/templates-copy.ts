/**
 * Templates list copy — the single source of truth for the "My templates"
 * screen's user-facing strings (page heading, entry-point label, empty/error
 * states, and the per-card meta line). Kept here so structure/tone stay
 * consistent and auditable, mirroring `lib/settings-copy.ts` / `lib/todo-copy.ts`.
 *
 * Tone follows the project base voice (design-spec `tone/*`): plain, calm,
 * action-forward, never blaming the user. Alongside the read-only list strings,
 * this owns the per-card management actions (preview, rename, delete, start
 * from this template) and the rename / delete-confirm / preview dialog copy —
 * the destructive confirm names the consequence plainly and offers a calm way
 * out, never blaming.
 */

/** Label for the entry point that opens the templates list (dashboard). */
export const TEMPLATES_ENTRY_LABEL = 'My templates';

export const TEMPLATES_COPY = {
  /** H1 at the top of the list. Matches the save dialog's "My templates" promise. */
  title: 'My templates',
  /** One-line intro under the title. */
  description:
    'All your saved forms in one place. Load one instantly when creating a new contract.',
  /** Accessible name for the list landmark. */
  listLabel: 'Template list',
  /** Empty state — no template saved yet. */
  emptyTitle: 'No saved templates yet',
  emptyDescription:
    'Save your frequently used forms as templates, and next time you can send right away without placing fields.',
  /** Empty-state CTA → the wizard, where a template gets saved. */
  emptyCta: 'Create a new contract',
  /** Retry label shown when the list fails to load. */
  errorRetry: 'Try again',
} as const;

/**
 * Per-card management actions on the `/templates` list (manageable Extension) and
 * the dialogs they open (rename / delete-confirm / preview). Grouped so the whole
 * management surface reads in one voice.
 */
export const TEMPLATE_ACTIONS_COPY = {
  /** Primary card action → `/contracts/new?template=id` (reuse this layout). */
  start: 'Start from this template',
  /** Open the read-only PDF preview modal. */
  preview: 'Preview',
  /** Open the rename modal. */
  rename: 'Rename',
  /** Open the delete-confirm modal. */
  delete: 'Delete',
  /** a11y group label for the action cluster; `{name}` is the template name. */
  actionsLabel: (name: string) => `Manage ${name}`,

  /** Rename modal. */
  rename_dialog: {
    title: 'Rename template',
    description: 'Choose a name that is easy to find in the list.',
    nameLabel: 'Template name',
    namePlaceholder: 'e.g. Standard Employment Agreement',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving',
  },

  /** Delete-confirm modal. */
  delete_dialog: {
    /** `{name}` is the template name. */
    title: (name: string) => `Delete '${name}'?`,
    description:
      'This cannot be undone. Contracts you have already sent are not affected.',
    cancel: 'Cancel',
    confirm: 'Delete',
    deleting: 'Deleting',
  },

  /**
   * Preview modal — read-only render of the template's source PDF with its saved
   * field layout overlaid. The purpose is confirming *where fields sit*, so the
   * description says so plainly and reassures that previewing never edits.
   */
  preview_dialog: {
    /** `{name}` is the template name. */
    title: (name: string) => `${name} preview`,
    /** States the modal's purpose: confirm field placement, non-destructive. */
    description:
      'See where the saved signature, date, and text fields sit on the PDF. Previewing never changes the template.',
    loading: 'Loading the preview.',
    error: 'We could not load the preview.',
    retry: 'Try again',
    close: 'Close',
  },

  /** Page-level banner shown when an optimistic rename/delete is rolled back. */
  renameFailed: 'We could not rename the template, so we restored the original name.',
  deleteFailed: 'We could not delete the template, so we put it back in the list.',
} as const;

/**
 * Read-only field-overlay preview surface (`template-field-preview.tsx`). Copy
 * for the page-flip controls, the field-type legend, and the per-field recipient
 * badge. This surface only *shows* where fields sit — no edit/save verbs — so the
 * tone stays purely descriptive ("what sits where"), matching `tone/templates-list.md`.
 */
export const TEMPLATE_FIELD_PREVIEW_COPY = {
  /** Accessible name for the rendered page canvas. `{page}`/`{total}` 1-based. */
  pageLabel: (page: number, total: number) => `Template preview, page ${page} of ${total}`,
  /** Prev/next page control labels (shown only for multi-page templates). */
  prevPage: 'Previous page',
  nextPage: 'Next page',
  /** Page position indicator, e.g. `2 / 5`. */
  pageIndicator: (page: number, total: number) => `${page} / ${total}`,
  /** Legend heading above the field-type swatches. */
  legendLabel: 'Field types',
  /** a11y name for a field box + its badge; `{n}` is the 1-based recipient slot. */
  recipientBadgeLabel: (n: number) => `Recipient ${n}`,
  /** Explains the number badge — shown only when a template has 2+ recipients. */
  recipientHint: 'The number at the top left of each box is the signing order of the recipient.',
  /** Shown over the page when the current page holds no placed fields. */
  noFieldsOnPage: 'There are no fields placed on this page.',
  /** Own loading + read-failure states (mirrors `PdfRenderError`'s message). */
  loading: 'Loading the preview.',
  error: 'We could not read the PDF. Please check that the file is not damaged.',
} as const;

/** Units for the per-card meta line (page count · field count · saved date). */
export const TEMPLATE_META_COPY = {
  /** `2 pages` — page count of the source PDF. */
  pages: (n: number) => `${n} ${n === 1 ? 'page' : 'pages'}`,
  /** `3 fields` — how many placed fields the saved layout holds. */
  fields: (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`,
  /** Suffix appended to the relative time, e.g. `saved 3 days ago`. */
  savedSuffix: 'saved',
} as const;
