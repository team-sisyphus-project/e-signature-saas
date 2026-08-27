'use client';

/**
 * Wizard step — delivery method.
 *
 * The fork between the two ways a finished contract reaches its signer:
 * emailing a signature request, or sharing a link anyone can open. The step
 * presents two selection cards; picking one dispatches SET_DELIVERY_METHOD,
 * which extends the step sequence with the matching tail (see wizard-context)
 * and unlocks the shell's Next through canProceed. Routing to the next step
 * stays with the shell — this step only records the choice.
 *
 * The cards are a `role="radiogroup"` of two `role="radio"` options with roving
 * tabindex + arrow-key navigation, so the choice is reachable by keyboard alone.
 */

import * as React from 'react';
import { Card, cn } from '@repo/ui';
import { useTranslation } from '@/components/locale-provider';
import type { WebTranslationKey } from '@/lib/web-translations';
import { useWizard, type DeliveryMethod } from './wizard-context';

interface DeliveryOption {
  method: DeliveryMethod;
  labelKey: WebTranslationKey;
  descriptionKey: WebTranslationKey;
  icon: React.ReactNode;
}

/**
 * The two branches, in presentation order. The list carries catalog keys rather
 * than resolved words so it stays a module constant — the roving-tabindex logic
 * below indexes into it and must not be rebuilt on every render.
 */
const OPTIONS: readonly DeliveryOption[] = [
  {
    method: 'email',
    labelKey: 'wizard.deliveryEmail',
    descriptionKey: 'wizard.deliveryEmailBody',
    icon: <MailIcon />,
  },
  {
    method: 'link',
    labelKey: 'wizard.deliveryLink',
    descriptionKey: 'wizard.deliveryLinkBody',
    icon: <LinkIcon />,
  },
];

export function DeliveryMethodStep() {
  const t = useTranslation();
  const { state, dispatch } = useWizard();
  const selected = state.deliveryMethod;

  const select = React.useCallback(
    (method: DeliveryMethod) => dispatch({ type: 'SET_DELIVERY_METHOD', method }),
    [dispatch],
  );

  // Roving tabindex: the focused/selected card is the single tab stop; arrows
  // move focus and selection between the options (WAI-ARIA radiogroup pattern).
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const focusIndex = React.useCallback((index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length;
    const el = cardRefs.current[next];
    if (el) el.focus();
    select(OPTIONS[next]!.method);
  }, [select]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusIndex(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusIndex(index - 1);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          select(OPTIONS[index]!.method);
          break;
        default:
          break;
      }
    },
    [focusIndex, select],
  );

  // The tab stop is the selected card, or the first card when nothing is chosen.
  const tabStop = selected ? OPTIONS.findIndex((o) => o.method === selected) : 0;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-2xs">
        <h2 className="text-xl font-bold text-foreground">{t('wizard.deliveryTitle')}</h2>
        <p className="text-sm text-foreground-subtle">{t('wizard.deliveryDescription')}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t('wizard.deliveryTitle')}
        className="grid gap-sm sm:grid-cols-2"
      >
        {OPTIONS.map((option, index) => {
          const isSelected = selected === option.method;
          return (
            <Card
              key={option.method}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              interactive
              role="radio"
              aria-checked={isSelected}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => select(option.method)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'flex flex-col gap-sm p-lg',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus',
                isSelected
                  ? 'border-primary bg-primary-subtle'
                  : 'hover:border-border-strong',
              )}
            >
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-base ease-standard',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary-subtle text-primary',
                )}
              >
                {option.icon}
              </span>
              <div className="flex flex-col gap-2xs">
                <span className="text-base font-bold text-foreground">{t(option.labelKey)}</span>
                <span className="text-sm text-foreground-subtle">
                  {t(option.descriptionKey)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M9 15l6-6M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
