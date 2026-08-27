/**
 * Contract-detail bindings — the one thing the sender's detail screen renders
 * that is computed rather than read from the catalog.
 *
 * Every fixed string this screen shows now lives in the `contracts` domain of
 * the browser catalog (`lib/i18n/contracts.ts`) and is read straight from `t()`
 * at the render site. A calendar date is not copy: no catalog entry can hold it,
 * because it is assembled from an instant and a locale. It lives here so it can
 * be unit-tested without mounting the screen.
 */

import type { SupportedLocale } from './locale';

/** Rendered in place of a date that cannot be parsed (never a raw value). */
export const UNKNOWN_DATE = '—';

/**
 * A contract's summary date, written the way the reader's language writes short
 * dates: `2026.08.27` in Korean, `Aug 27, 2026` in English.
 *
 * Both are built from the same instant in KST, the zone the product's own
 * timestamps (sent, completed) are stated in — so switching language re-words
 * the date without moving it a day.
 *
 * Korean is assembled from the numeric parts rather than from `ko-KR`'s own
 * short pattern (`2026. 8. 27.`), because this exact `YYYY.MM.DD` form is what
 * the dashboard already shows for the same timestamps; the two screens must not
 * disagree about a date the sender is comparing across them.
 */
export function formatContractDate(iso: string, locale: SupportedLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN_DATE;

  if (locale === 'ko') {
    const parts = numericParts(date);
    return `${parts.year}.${parts.month}.${parts.day}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: CONTRACT_TIME_ZONE,
  }).format(date);
}

/** The zone every contract timestamp is stated in (see `lib/sharing.ts`). */
const CONTRACT_TIME_ZONE = 'Asia/Seoul';

/** `en-CA` yields ISO-ordered `2026-08-27`, the only pattern we reshape. */
function numericParts(date: Date): { year: string; month: string; day: string } {
  const [year = '', month = '', day = ''] = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: CONTRACT_TIME_ZONE,
  })
    .format(date)
    .split('-');
  return { year, month, day };
}
