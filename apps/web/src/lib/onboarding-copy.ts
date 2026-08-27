/**
 * Onboarding guide copy bindings — the first-run walkthrough new users see on an
 * empty dashboard, assembled from `dashboard.onboarding*` catalog keys.
 *
 * As in `lib/todo-copy.ts`, no wording lives here: this module only shapes
 * catalog copy into the props OnboardingGuide renders, so the component owns no
 * text and no text escapes the catalog.
 */

import type { WebTranslate } from './web-translations';

/** One numbered step in the first-contract walkthrough. */
export interface OnboardingStep {
  /** Short verb-phrase heading. */
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
  /** The ordered steps: upload, request a signature, track to completion. */
  steps: OnboardingStep[];
  /** Primary CTA label that triggers `onCreate` (start the first real contract). */
  cta: string;
}

/**
 * Onboarding copy for the active locale. The three steps mirror the real flow a
 * new user is about to take — upload, request a signature, track completion —
 * kept to one calm sentence each. Voice: invite the next action, never pressure.
 */
export function onboardingCopy(t: WebTranslate): OnboardingCopy {
  return {
    title: t('dashboard.onboardingTitle'),
    description: t('dashboard.onboardingDescription'),
    steps: [
      {
        title: t('dashboard.onboardingUploadTitle'),
        description: t('dashboard.onboardingUploadDescription'),
      },
      {
        title: t('dashboard.onboardingRequestTitle'),
        description: t('dashboard.onboardingRequestDescription'),
      },
      {
        title: t('dashboard.onboardingTrackTitle'),
        description: t('dashboard.onboardingTrackDescription'),
      },
    ],
    cta: t('dashboard.onboardingCta'),
  };
}
