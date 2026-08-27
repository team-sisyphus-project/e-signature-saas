'use client';

/**
 * Contract-creation wizard shell.
 *
 * Owns the chrome shared across every step: a sticky header, the StepIndicator
 * (whose current node plays the `step-bounce` pop on each transition), the
 * animated content region, and the back/next footer. Step *content* lives in
 * slot components resolved by step key.
 *
 * The step sequence forks on the chosen delivery method (see wizard-context):
 * upload → fields → delivery, then either recipients → review ('email') or
 * share link ('link'). The StepIndicator, slot, and last-step footer rule all
 * read the active branch rather than a fixed step list.
 *
 * Navigation is centralized: a step never advances itself. It writes to wizard
 * state, and `canProceed()` decides whether Next unlocks — so as later grains
 * add their data, the gate lights up without touching this shell.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, StepIndicator } from '@repo/ui';
import { useTranslation } from '@/components/locale-provider';
import {
  WizardProvider,
  useWizard,
  canProceed,
  currentStepKey,
  isLastStep,
  stepSequence,
  STEP_LABEL_KEYS,
  type StepKey,
  type WizardPreload,
} from './wizard-context';
import { UploadStep } from './upload-step';
import { FieldsStep } from './fields-step';
import { DeliveryMethodStep } from './delivery-method-step';
import { RecipientsStep } from './recipients-step';
import { ReviewStep } from './review-step';
import { LinkShareStep } from './link-share-step';

export function ContractWizard({ preload }: { preload?: WizardPreload }) {
  return (
    <WizardProvider preload={preload}>
      <WizardShell />
    </WizardProvider>
  );
}

function WizardShell() {
  const router = useRouter();
  const t = useTranslation();
  const { state, goNext, goBack } = useWizard();
  const proceed = canProceed(state);
  // Labels/slot are driven by the branch the chosen delivery method carves out,
  // never by a fixed step list.
  const steps = stepSequence(state.deliveryMethod);
  const stepKey = currentStepKey(state);
  const lastStep = isLastStep(state);

  const exit = React.useCallback(() => router.push('/dashboard'), [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between px-md py-sm">
          <span className="text-base font-bold tracking-tight text-primary">
            {t('wizard.product')}
          </span>
          <Button variant="ghost" size="sm" onClick={exit} aria-label={t('wizard.exitLabel')}>
            {t('wizard.exit')}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-md pt-lg">
        <StepIndicator
          steps={steps.map((key) => t(STEP_LABEL_KEYS[key]))}
          current={state.step}
          label={t('wizard.stepIndicatorLabel')}
        />
      </div>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-md py-xl">
        {/* Re-keying by step replays the directional slide on every transition. */}
        <div
          key={state.step}
          className={state.direction === 1 ? 'animate-wizard-forward' : 'animate-wizard-back'}
        >
          <StepSlot stepKey={stepKey} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-md px-md py-md">
          <Button
            variant="ghost"
            size="md"
            onClick={state.step === 0 ? exit : goBack}
          >
            {t(state.step === 0 ? 'wizard.cancel' : 'wizard.back')}
          </Button>

          {!lastStep ? (
            <Button size="md" onClick={goNext} disabled={!proceed} className="min-w-[120px]">
              {t('wizard.next')}
            </Button>
          ) : (
            // Terminal steps (review / share link) render their own CTA in their
            // slot, so the shell leaves its footer-right empty here.
            <span aria-hidden="true" />
          )}
        </div>
      </footer>
    </div>
  );
}

/** Renders the active step's content, resolved by step key. */
function StepSlot({ stepKey }: { stepKey: StepKey }) {
  switch (stepKey) {
    case 'upload':
      return <UploadStep />;
    case 'fields':
      return <FieldsStep />;
    case 'delivery':
      return <DeliveryMethodStep />;
    case 'recipients':
      return <RecipientsStep />;
    case 'review':
      return <ReviewStep />;
    case 'link':
      return <LinkShareStep />;
    default:
      return null;
  }
}
