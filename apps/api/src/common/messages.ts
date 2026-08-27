/**
 * Centralized, user-facing API messages.
 *
 * Tone follows the Toss-inspired voice defined in the design spec
 * (`design-spec/messaging/recording.md`):
 *   - Never blame the user; gently guide them to the next action.
 *   - Calm, polite phrasing ("Please…", "Check… and try again", "…can't be done right now").
 *   - Success headlines follow the format specified in the spec ("… is complete!").
 *   - Never expose internal system details (stack traces / root causes).
 *
 * Keep every user-visible string here so copy stays consistent and auditable.
 */
export const MESSAGES = {
  auth: {
    // Login failure — don't specify which part was wrong, for both security and tone.
    invalidCredentials: 'Check your email or password and try again.',
    emailTaken: 'This email is already registered. Please sign in instead.',
    unauthorized: 'You need to sign in. Please sign in again.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    // Google social auth failure — invalid/expired authorization code, token exchange or verification failure, etc.
    // Don't specify the failure cause (code expiry / verification error and other internals); only guide the next action.
    googleAuthFailed: 'Google sign-in failed. Please try again.',
    // The Google account's email is not verified yet — guide the next action (verify the email).
    googleEmailUnverified:
      'Your Google account email needs to be verified. Verify your email, then try again.',
    // Google credentials are not configured on the server, so sign-in is temporarily unavailable —
    // don't expose internal configuration details; present it only as temporarily unavailable (503).
    googleUnavailable: 'Google sign-in is unavailable right now. Please try again later.',
  },
  document: {
    notFound: 'The requested contract could not be found.',
    forbidden: 'You do not have permission to access this contract.',
    // Completion post-processing (final contract / certificate) is not finished yet, so it can't be downloaded.
    artifactNotReady: 'The completed documents are not ready yet. Please try again shortly.',
    invalidFileType: 'Only PDF files can be uploaded.',
    emptyFile: 'This file is empty. Try again with a different PDF.',
    corruptPdf: 'This PDF could not be read. Check that the file is not corrupted.',
    fileTooLarge: 'This file is too large. Upload a PDF of 20MB or less.',
  },
  field: {
    outOfRange: 'The signature field position is not valid. Place it inside the document.',
  },
  // Reusable template (frequently sent forms) management copy — same tone as document:
  // no blame, calmly state what happened and gently guide the next action.
  template: {
    // Viewing/editing/deleting a template that doesn't exist or was already deleted.
    notFound: 'The requested template could not be found.',
    // Accessing another user's template (owner-scope violation).
    forbidden: 'You do not have permission to access this template.',
    // Plan storage limit exceeded — state the limit and guide the next action (delete or upgrade).
    limitReached:
      'You have used all of your template slots. Delete an existing template or upgrade your plan.',
  },
  // Service-wide branding (logo, favicon, brand color) management copy.
  // Format/size violation copy must match the client guard (`IMAGE_VALIDATION_COPY` in
  // `apps/web/src/lib/image-validation.ts`) **word for word**, so users see the same
  // guidance whether the check fires on the web or the API (no blame; what happened + next action).
  branding: {
    // Allowed format (SVG/PNG) violation — mimetype, extension, or magic-byte re-validation failure.
    invalidType: 'Only SVG or PNG files can be uploaded. Try again with a different file.',
    // Empty (0-byte) file.
    emptyFile: 'This file is empty. Try again with a different file.',
    // Over 1MB.
    fileTooLarge: 'This file is too large. Upload an SVG or PNG file of 1MB or less.',
    // The upload itself failed (unexpected upload error beyond format/size) — no internal details.
    uploadFailed: 'The image could not be uploaded. Try again with a different file.',
    // Brand color HEX format violation — same tone as the color picker guard (`BRAND_COLOR_COPY`).
    invalidColor: 'Check the color code. Enter 3 or 6 digits, like #163AF2.',
    // Request to serve a branding image that is not set yet or can't be found.
    assetNotFound: 'The requested branding image could not be found.',
  },
  send: {
    noRecipients: 'Add at least one recipient.',
    alreadySent: 'This contract has already been sent.',
    noFields: 'Place at least one signature field before sending.',
    // Free plan monthly limit of 5 exceeded — state the limit clearly and guide the next action (upgrade / next month).
    quotaExceeded:
      'You have used all 5 free sends for this month. Send again next month or upgrade your plan.',
  },
  // Signer-facing messages — copy shown to external signers who open the link.
  // Same tone as the sender side: no blame, gently guide the next action.
  signing: {
    // Invalid/missing signing link — the token itself is not valid.
    invalidLink: 'This signing link is invalid. Ask the sender for a new link.',
    // 6-digit code mismatch — don't specify which digit was wrong.
    codeMismatch: 'The verification code does not match. Please check and try again.',
    // Format error (not a 6-digit number).
    codeFormat: 'Enter the 6-digit verification code exactly.',
    // Temporary lock after repeated failures — the lock lifts automatically as time passes.
    locked: 'Verification failed too many times. Please try again later.',
    // Signer session (short-lived token) expired — gently guide them to re-enter the code.
    sessionExpired: 'Some time has passed since identity verification. Enter the verification code again.',
    // Re-accessing a contract that has already been signed.
    alreadySigned: 'This contract has already been signed.',
    // A state where signing is no longer possible (canceled/expired contract, etc.).
    notSignable: 'This contract can no longer be signed. Please contact the sender.',
    // The signature/input value does not match the expected format.
    invalidFieldValue: 'Check the value you entered and try again.',
    // Assigned signature fields are still empty, so completion is not possible.
    fieldsIncomplete: 'Some fields are still blank. Fill them all in before finishing.',
    // Completion success headline — the spec's "… is complete!" format.
    completed: 'Signing is complete!',
  },
  // Link sharing — copy shown to recipients who open a unique view/fill link created by the sender.
  // Follows the `design-spec/messaging/share-link.md` tone guide exactly (no blame,
  // gently guide only the next action, never expose internal system details).
  share: {
    // The token itself is missing or this is not a LINK link — guide the next action (request a new link).
    invalidLink: 'This link is invalid. Ask the sender for a new link.',
    // The link's validity period has passed (`linkExpiresAt` elapsed) — spec notice-screen `expired`.
    expired: 'This link has expired. Ask the sender for a new link.',
    // The sender disabled this link (`linkRevokedAt`) — spec notice-screen `disabled`.
    revoked: 'The sender has disabled this link. Please contact the sender.',
    // The link requires a password but the password is empty — spec password-gate placeholder.
    passwordRequired: 'Please enter the password.',
    // Password mismatch — don't specify which character was wrong. Spec password-gate error.
    wrongPassword: 'The password does not match. Please check and try again.',
    // Temporary lock after repeated failures — the lock lifts automatically as time passes.
    locked: 'The password was entered incorrectly too many times. Please try again later.',
    // Short-lived share session (post-access token) expired — gently guide them to reopen the link.
    sessionExpired: 'Your session has expired. Please open the link again.',
    // A state where filling in is no longer possible (canceled contract, etc.).
    notSignable: 'This contract cannot be filled in right now. Please contact the sender.',
    // Re-accessing a link that has already been submitted.
    alreadySubmitted: 'This contract has already been submitted.',
    // Submission success headline — spec completion-screen headline.
    submitted: 'Submission is complete!',
  },
} as const;

/**
 * Signer identity-verification (6-digit code) protection policy.
 * When consecutive failures reach the lock threshold, verification is blocked
 * for the lock window, then automatically released as time passes.
 */
export const SIGNER_VERIFY_MAX_ATTEMPTS = 5;
/** Lock window — failures within this many minutes determine whether to lock. */
export const SIGNER_VERIFY_LOCK_WINDOW_MINUTES = 15;
/** Signer session (short-lived token) time to live. */
export const SIGNER_SESSION_TTL_MINUTES = 30;

/**
 * Share-link password protection policy — mirrors the signer verification policy
 * (reusing `policy`) but applies minimally to share access only. When consecutive
 * failures reach the threshold, lock for the lock window, then automatically release.
 */
export const SHARE_UNLOCK_MAX_ATTEMPTS = SIGNER_VERIFY_MAX_ATTEMPTS;
/** Lock window — failures within this many minutes determine whether to lock. */
export const SHARE_UNLOCK_LOCK_WINDOW_MINUTES = SIGNER_VERIFY_LOCK_WINDOW_MINUTES;
/** Share-link short-lived session (post-access token) time to live. */
export const SHARE_SESSION_TTL_MINUTES = SIGNER_SESSION_TTL_MINUTES;
/** Default link validity period (1 week) — matches the spec modal's default selection. */
export const SHARE_LINK_DEFAULT_EXPIRY_DAYS = 7;
/** Maximum link validity period (days). */
export const SHARE_LINK_MAX_EXPIRY_DAYS = 365;

/** Free plan monthly send limit. */
export const FREE_PLAN_MONTHLY_LIMIT = 5;
