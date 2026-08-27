/**
 * Copy for the sender's contract detail screen (`/contracts/[id]`).
 *
 * Centralized here like `SIGNER_COPY` / `COMPLETION_DOWNLOAD_COPY` so the screen
 * binds to a single source of truth (design-spec
 * `messaging/contract-detail.md`). The share-link *creation* modal and the link
 * list rendering live in grain-5; this module only owns the detail-screen shell,
 * the share entry point, and the empty/placeholder copy.
 */

export const CONTRACT_DETAIL_COPY = {
  /** Back affordance → dashboard. */
  back: 'Contracts',
  backAria: 'Back to contract list',

  /** Summary definition list labels. */
  summary: {
    recipients: 'Recipients',
    pages: 'Length',
    created: 'Created',
    sent: 'Sent',
    completed: 'Completed',
    /** Shown when the contract has no addressed recipients (link-only sharing). */
    linkOnly: 'Link sharing',
    recipientCount: (n: number) => `${n} ${n === 1 ? 'recipient' : 'recipients'}`,
    pageCount: (n: number) => `${n} ${n === 1 ? 'page' : 'pages'}`,
  },

  /** Share-link section (the 'Share via link' entry point + link list slot). */
  share: {
    sectionTitle: 'Share links',
    sectionHelp:
      'Create a link and send it to a recipient — they can open and fill out the contract without signing in.',
    createButton: 'Share via link',
    emptyTitle: 'No share links yet',
    emptyBody: 'Select "Share via link" to create your first link.',
  },

  /** 404 / no-access terminal for the detail route. */
  notFoundTitle: 'We could not find that contract',
  notFoundBody: 'This contract may have been deleted or you may not have access to it.',
  notFoundAction: 'Back to contracts',
} as const;
