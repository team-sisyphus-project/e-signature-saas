'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Checkbox, Field, Input, SuccessCheck } from '@repo/ui';
import { BlobBackground } from '@/components/blob-background';
import { PasswordInput } from '@/components/password-input';
import { GoogleButton } from '@/components/google-button';
import { AuthDivider } from '@/components/auth-divider';
import { ApiError, GENERIC_ERROR } from '@/lib/api';
import { isAuthenticated, register, loginWithGoogle } from '@/lib/auth';
import { GoogleAuthError, useGoogleAuthCode } from '@/lib/google-oauth';

/** Pragmatic email shape check — the server is the real authority. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Keep in sync with the backend `RegisterDto` `@MinLength(8)`. */
const PASSWORD_MIN = 8;

/** Brief success beat before handing off to the dashboard (ms). */
const SUCCESS_HANDOFF_MS = 1100;

type FieldErrors = {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  terms?: string;
};

function validate(
  email: string,
  password: string,
  passwordConfirm: string,
  agreed: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  const trimmed = email.trim();
  if (!trimmed) {
    errors.email = 'Enter your email address.';
  } else if (!EMAIL_RE.test(trimmed)) {
    errors.email = 'Check your email address.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  } else if (password.length < PASSWORD_MIN) {
    errors.password = `Your password must be at least ${PASSWORD_MIN} characters.`;
  }

  if (!passwordConfirm) {
    errors.passwordConfirm = 'Enter your password one more time.';
  } else if (password !== passwordConfirm) {
    errors.passwordConfirm = 'The passwords do not match. Please check again.';
  }

  if (!agreed) {
    errors.terms = 'You must agree to the terms to sign up.';
  }

  return errors;
}

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [succeeded, setSucceeded] = React.useState(false);
  // Only surface inline field errors once the field has been engaged.
  const [touched, setTouched] = React.useState<{
    email: boolean;
    password: boolean;
    passwordConfirm: boolean;
    terms: boolean;
  }>({ email: false, password: false, passwordConfirm: false, terms: false });

  // Google social sign-up (graceful no-op when the client id isn't configured).
  const { available: googleAvailable, requestCode } = useGoogleAuthCode();
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [googleError, setGoogleError] = React.useState<string | null>(null);

  // While either auth path is in flight, the whole form is inert.
  const busy = submitting || googleLoading;

  // Already signed in → go straight to the dashboard (session established).
  React.useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const revalidate = React.useCallback(
    (nextEmail: string, nextPassword: string, nextConfirm: string, nextAgreed: boolean) => {
      setFieldErrors((prev) =>
        // Only refresh errors once something is already in an error state, so we
        // never flash an error before the user has had a chance to type.
        Object.keys(prev).length === 0
          ? prev
          : validate(nextEmail, nextPassword, nextConfirm, nextAgreed),
      );
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setGoogleError(null);

    const errors = validate(email, password, passwordConfirm, agreed);
    setTouched({ email: true, password: true, passwordConfirm: true, terms: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await register(email.trim(), password);
      // Session is established; show a brief success beat, then hand off.
      setSucceeded(true);
      window.setTimeout(() => router.replace('/dashboard'), SUCCESS_HANDOFF_MS);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : GENERIC_ERROR);
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const code = await requestCode();
      await loginWithGoogle(code);
      // Same success beat as email sign-up before the dashboard handoff.
      setSucceeded(true);
      window.setTimeout(() => router.replace('/dashboard'), SUCCESS_HANDOFF_MS);
    } catch (error) {
      setGoogleError(
        error instanceof ApiError || error instanceof GoogleAuthError
          ? error.message
          : GENERIC_ERROR,
      );
      setGoogleLoading(false);
    }
  }

  if (succeeded) {
    return (
      <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-md py-2xl">
        <BlobBackground />
        <Card className="motion-stagger relative z-10 flex w-full max-w-[420px] flex-col items-center gap-md p-xl text-center shadow-lg sm:p-2xl">
          <SuccessCheck />
          <div role="status" aria-live="polite" className="flex flex-col gap-xs">
            <h1 className="text-2xl font-bold text-foreground">Your account is ready!</h1>
            <p className="text-base text-foreground-subtle">Taking you to your dashboard.</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-md py-2xl">
      <BlobBackground />

      <Card className="motion-stagger relative z-10 w-full max-w-[420px] p-xl shadow-lg sm:p-2xl">
        <header className="mb-xl flex flex-col gap-xs">
          <span className="text-sm font-bold tracking-tight text-primary">eSign</span>
          <h1 className="text-2xl font-bold text-foreground">Let&apos;s get started</h1>
          <p className="text-base text-foreground-subtle">
            Create an account with your email and password.
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Field label="Email" htmlFor="email" error={touched.email ? fieldErrors.email : undefined}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              invalid={touched.email && Boolean(fieldErrors.email)}
              aria-describedby={touched.email && fieldErrors.email ? 'email-message' : undefined}
              disabled={busy}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormError(null);
                revalidate(e.target.value, password, passwordConfirm, agreed);
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, email: true }));
                setFieldErrors(validate(email, password, passwordConfirm, agreed));
              }}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            hint={
              touched.password && fieldErrors.password ? undefined : `Use at least ${PASSWORD_MIN} characters.`
            }
            error={touched.password ? fieldErrors.password : undefined}
          >
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              invalid={touched.password && Boolean(fieldErrors.password)}
              aria-describedby={touched.password && fieldErrors.password ? 'password-message' : undefined}
              disabled={busy}
              onChange={(e) => {
                setPassword(e.target.value);
                setFormError(null);
                revalidate(email, e.target.value, passwordConfirm, agreed);
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, password: true }));
                setFieldErrors(validate(email, password, passwordConfirm, agreed));
              }}
            />
          </Field>

          <Field
            label="Confirm password"
            htmlFor="passwordConfirm"
            error={touched.passwordConfirm ? fieldErrors.passwordConfirm : undefined}
          >
            <PasswordInput
              id="passwordConfirm"
              name="passwordConfirm"
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={passwordConfirm}
              invalid={touched.passwordConfirm && Boolean(fieldErrors.passwordConfirm)}
              aria-describedby={
                touched.passwordConfirm && fieldErrors.passwordConfirm
                  ? 'passwordConfirm-message'
                  : undefined
              }
              disabled={busy}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setFormError(null);
                revalidate(email, password, e.target.value, agreed);
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, passwordConfirm: true }));
                setFieldErrors(validate(email, password, passwordConfirm, agreed));
              }}
            />
          </Field>

          <div className="flex flex-col gap-xs">
            <Checkbox
              id="terms"
              name="terms"
              checked={agreed}
              invalid={touched.terms && Boolean(fieldErrors.terms)}
              aria-describedby={touched.terms && fieldErrors.terms ? 'terms-message' : undefined}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.checked;
                setAgreed(next);
                setFormError(null);
                setTouched((t) => ({ ...t, terms: true }));
                revalidate(email, password, passwordConfirm, next);
              }}
            >
              I agree to the <span className="font-medium text-foreground">Terms of Service</span> and{' '}
              <span className="font-medium text-foreground">Privacy Policy</span>.
            </Checkbox>
            {touched.terms && fieldErrors.terms ? (
              <p id="terms-message" role="alert" className="text-sm text-danger">
                {fieldErrors.terms}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-md bg-danger-subtle px-md py-sm text-sm font-medium text-danger"
            >
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth isLoading={submitting} disabled={googleLoading}>
            {submitting ? 'Signing up' : 'Sign up'}
          </Button>
        </form>

        {googleAvailable ? (
          <div className="mt-lg flex flex-col gap-md">
            <AuthDivider />
            {googleError ? (
              <p
                role="alert"
                className="rounded-md bg-danger-subtle px-md py-sm text-sm font-medium text-danger"
              >
                {googleError}
              </p>
            ) : null}
            <GoogleButton
              label="Continue with Google"
              isLoading={googleLoading}
              disabled={submitting}
              onClick={handleGoogle}
            />
          </div>
        ) : null}

        <p className="mt-xl text-center text-sm text-foreground-subtle">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
