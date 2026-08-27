'use client';

/**
 * `/contracts/[id]` — the sender's contract detail screen.
 *
 * Routed to from a dashboard ContractCard. Mirrors the dashboard's auth guard
 * (bounce unauthenticated visitors to login) and quality bar: a loading skeleton,
 * a friendly 404 / not-found terminal, and a retryable error state. The detail
 * itself comes from the existing `GET /documents/:id` endpoint.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Skeleton } from '@repo/ui';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { useTranslation } from '@/components/locale-provider';
import { ApiError } from '@/lib/api';
import { clearSession, getToken } from '@/lib/auth';
import { fetchDocumentDetail, type DocumentDetail } from '@/lib/documents';

const DASHBOARD_ROUTE = '/dashboard';

/**
 * A failed load, in the two shapes the screen renders differently: a 404 is a
 * terminal with its own way out, anything else is retryable. The server's own
 * message is kept for the retryable case — it is more specific than our
 * catch-all, and localizing it is milestone 4's job.
 */
type LoadError = { kind: 'notFound' } | { kind: 'generic'; message: string };

export default function ContractDetailPage() {
  const t = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const [ready, setReady] = React.useState(false);
  const [document, setDocument] = React.useState<DocumentDetail | null>(null);
  const [error, setError] = React.useState<LoadError | null>(null);

  React.useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  const load = React.useCallback(async () => {
    setError(null);
    setDocument(null);
    try {
      setDocument(await fetchDocumentDetail(id));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearSession();
        router.replace('/login');
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setError({ kind: 'notFound' });
        return;
      }
      setError({
        kind: 'generic',
        message: err instanceof ApiError ? err.message : t('contracts.loadError'),
      });
    }
  }, [id, router, t]);

  React.useEffect(() => {
    if (!ready || !id) return;
    void load();
  }, [ready, id, load]);

  if (!ready) return null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <DetailHeader />
      <main className="mx-auto w-full max-w-[720px] px-md py-xl sm:py-2xl">
        {error?.kind === 'notFound' ? (
          <NotFoundState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void load()} />
        ) : document ? (
          <ContractDetail document={document} />
        ) : (
          <DetailSkeleton />
        )}
      </main>
    </div>
  );
}

function DetailHeader() {
  const t = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[720px] items-center px-md py-sm">
        <Link
          href={DASHBOARD_ROUTE}
          aria-label={t('contracts.backLabel')}
          className="-ml-2xs inline-flex items-center gap-2xs rounded-md px-2xs py-2xs text-sm font-medium text-foreground-subtle transition-colors duration-fast ease-standard hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
        >
          <BackIcon />
          {t('contracts.back')}
        </Link>
      </div>
    </header>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-xl" aria-hidden="true">
      <div className="flex items-start gap-md">
        <Skeleton shape="rect" className="h-12 w-12" />
        <div className="flex flex-1 flex-col gap-xs">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Card className="flex flex-col gap-md p-lg">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2xs">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col gap-md">
        <Skeleton className="h-5 w-28" />
        <Skeleton shape="rect" className="h-28 w-full" />
      </div>
    </div>
  );
}

function NotFoundState() {
  const t = useTranslation();

  return (
    <Card className="motion-stagger flex flex-col items-center gap-md px-lg py-3xl text-center">
      <div className="flex flex-col gap-2xs">
        <h1 className="text-lg font-bold text-foreground">{t('contracts.notFoundTitle')}</h1>
        <p className="text-base text-foreground-subtle">{t('contracts.notFoundDescription')}</p>
      </div>
      <Button asChild size="lg">
        <Link href={DASHBOARD_ROUTE}>{t('contracts.notFoundAction')}</Link>
      </Button>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslation();

  return (
    <Card className="flex flex-col items-center gap-md px-lg py-3xl text-center">
      <p className="text-base text-foreground-muted">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t('contracts.retry')}
      </Button>
    </Card>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
