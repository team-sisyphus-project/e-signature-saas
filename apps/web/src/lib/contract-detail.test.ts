/**
 * The contract-detail summary's calendar dates.
 *
 * A date is the one thing on this screen no catalog entry can hold: it is
 * assembled from an instant and a locale. What is pinned here is that the two
 * locales word the same instant differently but never name a different day —
 * a sender who switches language must not see a contract move.
 */

import { formatContractDate, UNKNOWN_DATE } from './contract-detail';

/** 18:00 KST on 27 August 2026. */
const AFTERNOON = '2026-08-27T09:00:00.000Z';
/** 08:30 KST on 28 August 2026 — the previous day in UTC and everywhere west. */
const EARLY_MORNING = '2026-08-27T23:30:00.000Z';

describe('formatContractDate', () => {
  it('writes the date the way the reader’s language writes short dates', () => {
    expect(formatContractDate(AFTERNOON, 'ko')).toBe('2026.08.27');
    expect(formatContractDate(AFTERNOON, 'en')).toBe('Aug 27, 2026');
  });

  it('keeps the numeric form the dashboard already shows for the same timestamps', () => {
    // Zero-padded, four-digit year first: switching between the list and the
    // detail must not change how a date the sender is comparing is written.
    expect(formatContractDate('2026-01-05T04:00:00.000Z', 'ko')).toBe('2026.01.05');
  });

  it('names the same day in both locales, whatever the reader’s clock says', () => {
    expect(formatContractDate(EARLY_MORNING, 'ko')).toBe('2026.08.28');
    expect(formatContractDate(EARLY_MORNING, 'en')).toBe('Aug 28, 2026');
  });

  it('marks an unparseable timestamp rather than rendering it raw', () => {
    expect(formatContractDate('not-a-date', 'en')).toBe(UNKNOWN_DATE);
    expect(formatContractDate('', 'ko')).toBe(UNKNOWN_DATE);
  });
});
