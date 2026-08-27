/**
 * Onboarding guide copy — the single source of truth for the user-facing strings
 * of the first-run welcome guide (the "make your first contract" walkthrough that
 * new users see on the dashboard).
 *
 * Source of truth for tone: design-spec/messaging/recording.md (project base
 * voice) — no blame, always give the next action, and stay calm (never
 * manufacture urgency). Per base voice principle 6, every user-facing string lives
 * in one place (`lib/*-copy.ts`), mirroring `lib/todo-copy.ts`; the OnboardingGuide
 * component takes these as props and never owns the wording itself.
 *
 * The design of the guide (step structure, tone, tokens, CTA rule) is recorded in
 * design-spec/components/onboarding-guide/base.md.
 */

/** One numbered step in the first-contract walkthrough. */
export interface OnboardingStep {
  /** Short verb-phrase heading, e.g. "Upload your contract". */
  title: string;
  /** One calm sentence describing the step. */
  description: string;
}

/** The full copy payload the OnboardingGuide renders (all strings injected). */
export interface OnboardingCopy {
  /** Guide heading. */
  title: string;
  /** One-line lead under the heading. */
  description: string;
  /** The ordered steps (1. upload, 2. request signatures, 3. track completion). */
  steps: OnboardingStep[];
  /** Primary CTA label that triggers `onCreate` (start the first real contract). */
  cta: string;
}

/**
 * Default onboarding copy. The three steps mirror the real product flow a new
 * user is about to take — upload → request signature → track completion — kept to
 * one calm sentence each. Base voice: invite the next action, never pressure.
 */
export const ONBOARDING_COPY: OnboardingCopy = {
  title: 'Send your first contract in 3 steps',
  description:
    'Here is how you send a contract and collect signatures. When you are ready, create your first contract.',
  steps: [
    {
      title: 'Upload your contract',
      description: 'Upload the PDF contract you need signed.',
    },
    {
      title: 'Send a signature request',
      description: 'Place the signature fields for each recipient and send it off.',
    },
    {
      title: 'Track it to completion',
      description: 'Follow everything from request to completion at a glance on the dashboard.',
    },
  ],
  cta: 'Create your first contract',
};
