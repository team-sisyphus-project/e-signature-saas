/**
 * New-contract start-screen copy — the single source of truth for the strings on
 * `/contracts/new`'s entry chooser (design-spec `tone/new-contract-start.md`).
 *
 * This screen sits in front of the wizard: the sender picks how to start —
 * uploading a fresh PDF, or starting from a saved template — before any wizard
 * step renders. Kept here (mirroring `lib/templates-copy.ts` / `lib/settings-copy.ts`)
 * so structure/tone stay consistent and auditable.
 *
 * Tone follows the project base voice: plain, calm, action-forward, never
 * blaming the user. Server-sent errors (template not found / forbidden, session
 * expiry) surface verbatim from the API; only transport failures fall back to the
 * neutral generic line, so no error *wording* is authored here.
 */
export const NEW_CONTRACT_COPY = {
  // --- start choice -------------------------------------------------------
  /** H1 above the two start options. */
  chooseTitle: 'Create a new contract',
  /** One-line prompt under the title. */
  chooseSubtitle: 'Choose how you would like to start.',
  /** Option 1 — the existing from-scratch upload path. */
  uploadTitle: 'Upload a new file',
  uploadBody: 'Upload a PDF and place the signature fields yourself.',
  /** Option 2 — start from a saved template (this grain). */
  fromTemplateTitle: 'Start from my templates',
  fromTemplateBody: 'Load a saved form — all you need to add are the recipients.',

  // --- template picker ----------------------------------------------------
  /** H1 of the template-selection view. */
  pickTitle: 'Choose a template',
  /** Sub-line explaining what selecting does. */
  pickSubtitle:
    'Selecting one loads the PDF and field layout as saved. Just add the recipients and you can send right away.',
  /** Back to the start choice. */
  pickBack: 'Back',
  /** Accessible name for the list landmark. */
  listLabel: 'Template list',
  /** a11y label for a selectable template card, e.g. `Start from the Standard Employment Agreement template`. */
  selectLabel: (name: string) => `Start from the ${name} template`,

  // --- empty (no saved templates) -----------------------------------------
  emptyTitle: 'No saved templates yet',
  emptyBody:
    'Save your frequently used forms as templates, and next time you can send right away without placing fields.',
  /** Empty-state CTA → fall back to the upload path. */
  emptyCta: 'Upload a new file',

  // --- preparing (loading the chosen template into the wizard) ------------
  preparingTitle: 'Loading the template',
  preparingBody: 'We are preparing the PDF and field layout. This will only take a moment.',

  // --- shared actions -----------------------------------------------------
  /** Retry a failed load (list fetch or template prepare). */
  retry: 'Try again',
  /** Bail out of a failed prepare back to the start choice. */
  startOver: 'Start a different way',
} as const;
