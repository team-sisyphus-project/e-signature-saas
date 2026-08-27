import { DocumentStatus } from '@repo/db';

/** Human-facing labels for document/contract status. */
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: 'Draft',
  [DocumentStatus.SCHEDULED]: 'Scheduled',
  [DocumentStatus.IN_PROGRESS]: 'In progress',
  [DocumentStatus.COMPLETED]: 'Completed',
  [DocumentStatus.CANCELLED]: 'Cancelled',
};
