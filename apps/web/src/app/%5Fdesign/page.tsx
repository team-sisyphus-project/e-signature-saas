'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Confetti,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  StepIndicator,
  SuccessCheck,
} from '@repo/ui';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-col gap-2xs">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {hint ? <p className="text-sm text-foreground-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const TOKEN_SWATCHES: { name: string; className: string; ring?: boolean }[] = [
  { name: 'background', className: 'bg-background', ring: true },
  { name: 'surface', className: 'bg-surface', ring: true },
  { name: 'surface-muted', className: 'bg-surface-muted', ring: true },
  { name: 'primary', className: 'bg-primary' },
  { name: 'primary-hover', className: 'bg-primary-hover' },
  { name: 'primary-subtle', className: 'bg-primary-subtle', ring: true },
  { name: 'success', className: 'bg-success' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'foreground-muted', className: 'bg-foreground-muted' },
  { name: 'border', className: 'bg-border', ring: true },
];

const TYPE_SCALE = ['display', '3xl', '2xl', 'xl', 'lg', 'md', 'base', 'sm', 'xs', '2xs'] as const;
const RADII = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const SHADOWS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

const STEPS = ['Upload document', 'Place signature fields', 'Add recipients', 'Send'];

export default function DesignSystemPage() {
  const [step, setStep] = React.useState(1);
  const [celebrate, setCelebrate] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Re-mount the success block so the stroke-draw + confetti replay on demand.
  const replay = () => {
    setCelebrate(false);
    setReloadKey((k) => k + 1);
    requestAnimationFrame(() => setCelebrate(true));
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3xl px-lg py-2xl">
      <header className="flex flex-col gap-xs">
        <p className="text-sm font-semibold text-primary">Design System</p>
        <h1 className="text-3xl font-bold text-foreground">Toss-style design system demo</h1>
        <p className="text-base text-foreground-muted">
          Tokens · motion · core primitives. All motion honors the system{' '}
          <code>prefers-reduced-motion</code> setting and falls back to a static
          presentation when reduction is on.
        </p>
      </header>

      <Section title="Color tokens" hint="Semantic color tokens. Values come from CSS variables.">
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 md:grid-cols-4">
          {TOKEN_SWATCHES.map((s) => (
            <div key={s.name} className="flex items-center gap-xs">
              <span
                className={`h-10 w-10 rounded-md ${s.className} ${s.ring ? 'ring-1 ring-inset ring-border' : ''}`}
              />
              <span className="text-sm text-foreground-muted">{s.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" hint="Pretendard-based type scale">
        <div className="flex flex-col gap-xs">
          {TYPE_SCALE.map((size) => (
            <div key={size} className="flex items-baseline gap-md">
              <span className="w-16 shrink-0 text-xs text-foreground-subtle">{size}</span>
              <span className={`text-${size} font-semibold text-foreground`}>
                The quick brown fox jumps over Aa 123
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius & Elevation">
        <div className="flex flex-wrap gap-lg">
          {RADII.map((r) => (
            <div key={r} className="flex flex-col items-center gap-2xs">
              <span className={`h-16 w-16 rounded-${r} bg-primary-subtle ring-1 ring-inset ring-border`} />
              <span className="text-xs text-foreground-subtle">radius {r}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-lg pt-md">
          {SHADOWS.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2xs">
              <span className={`h-16 w-16 rounded-lg bg-surface shadow-${s}`} />
              <span className="text-xs text-foreground-subtle">shadow {s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button" hint="Color transition on hover + scale press on active (tap feedback)">
        <div className="flex flex-wrap items-center gap-md">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isLoading>Sending</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-md">
          <Button size="sm">small</Button>
          <Button size="md">medium</Button>
          <Button size="lg">large</Button>
        </div>
      </Section>

      <Section title="Input & Field" hint="Label · hint · error states / focus ring (WCAG AA)">
        <div className="grid gap-lg sm:grid-cols-2">
          <Field label="Email" htmlFor="demo-email" hint="The signature request is sent to the recipient." required>
            <Input id="demo-email" type="email" placeholder="name@company.com" />
          </Field>
          <Field label="Name" htmlFor="demo-name" error="Enter a name." required>
            <Input id="demo-name" invalid placeholder="Jane Doe" />
          </Field>
        </div>
      </Section>

      <Section title="Card" hint="Interactive cards lift on hover (raise + deeper shadow)">
        <div className="grid gap-md sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Static card</CardTitle>
              <CardDescription>The default surface card.</CardDescription>
            </CardHeader>
            <CardContent className="text-base text-foreground-muted">Content area</CardContent>
          </Card>
          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Hover over it — hover lift.</CardDescription>
            </CardHeader>
            <CardContent className="text-base text-foreground-muted">Used for dashboard items and the like</CardContent>
          </Card>
        </div>
      </Section>

      <Section title="StepIndicator" hint="The active step bounces on entry; completed steps show a checkmark">
        <Card>
          <CardContent className="pt-lg">
            <StepIndicator steps={STEPS} current={step} />
            <div className="flex justify-between pt-lg">
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Skeleton" hint="Shimmer loading placeholder">
        <Card>
          <CardContent className="flex items-center gap-md pt-lg">
            <Skeleton shape="circle" className="h-12 w-12" />
            <div className="flex flex-1 flex-col gap-xs">
              <Skeleton shape="text" className="w-1/2" />
              <Skeleton shape="text" className="w-3/4" />
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Dialog & Sheet" hint="Radix-based — focus trap · Esc/overlay dismiss · enter/exit motion">
        <div className="flex flex-wrap gap-md">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send this contract?</DialogTitle>
                <DialogDescription>The recipient will be notified with a signature request.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Send</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Open bottom sheet</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Add your signature</SheetTitle>
                <SheetDescription>The bottom sheet used in the mobile signer flow.</SheetDescription>
              </SheetHeader>
              <div className="flex h-32 items-center justify-center rounded-md bg-surface-muted text-foreground-subtle">
                Signature canvas area
              </div>
              <SheetClose asChild>
                <Button fullWidth className="mt-md">
                  Done
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </Section>

      <Section title="Motion · gradient blobs" hint="Blobs drifting slowly in the background (18s loop)">
        <div className="relative h-48 overflow-hidden rounded-xl bg-grey-900">
          <span className="absolute -left-10 top-0 h-40 w-40 animate-blob rounded-full bg-primary opacity-60 blur-2xl" />
          <span
            className="absolute right-0 top-6 h-44 w-44 animate-blob rounded-full bg-success opacity-50 blur-2xl"
            style={{ animationDelay: '-6s' }}
          />
          <span
            className="absolute bottom-0 left-1/3 h-36 w-36 animate-blob rounded-full bg-warning opacity-40 blur-2xl"
            style={{ animationDelay: '-12s' }}
          />
        </div>
      </Section>

      <Section title="Motion · stagger fadeIn" hint="Lists/text enter one after another">
        <ul key={`stagger-${reloadKey}`} className="motion-stagger flex flex-col gap-xs">
          {['Contract_2026.pdf', 'Mutual_NDA.pdf', 'Services_Agreement_Final.pdf', 'Employment_Agreement.pdf'].map((doc) => (
            <li
              key={doc}
              className="rounded-md border border-border bg-surface px-md py-sm text-base text-foreground"
            >
              {doc}
            </li>
          ))}
        </ul>
        <div>
          <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Replay
          </Button>
        </div>
      </Section>

      <Section
        title="Motion · send complete (checkmark + confetti)"
        hint="The wow moment when a sender finishes sending"
      >
        <Card>
          <CardContent className="relative flex flex-col items-center gap-md overflow-visible py-2xl">
            {celebrate ? <Confetti key={`confetti-${reloadKey}`} /> : null}
            <div className="relative">
              {celebrate ? <SuccessCheck key={`check-${reloadKey}`} /> : <SuccessCheckPlaceholder />}
            </div>
            <p className="text-lg font-bold text-foreground">Your contract has been sent!</p>
            <Button onClick={replay}>Replay effect</Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Brand override hook" hint="Swap the primary token for the sender's brand color at runtime">
        <div
          className="rounded-xl border border-border p-lg"
          style={{
            // Sender branding override — only the brand hook is set; every
            // primary-colored child re-skins automatically.
            ['--brand-primary' as string]: '#7c3aed',
            ['--brand-primary-hover' as string]: '#6d28d9',
            ['--brand-primary-pressed' as string]: '#5b21b6',
            ['--brand-primary-subtle' as string]: '#f3e8ff',
          }}
        >
          <div className="flex flex-wrap items-center gap-md">
            <Button>Brand button</Button>
            <Button variant="secondary">Secondary</Button>
            <StepIndicator steps={['1', '2', '3']} current={1} className="max-w-xs" />
          </div>
        </div>
      </Section>
    </main>
  );
}

function SuccessCheckPlaceholder() {
  return <span className="block h-24 w-24 rounded-full bg-success-subtle" aria-hidden="true" />;
}
