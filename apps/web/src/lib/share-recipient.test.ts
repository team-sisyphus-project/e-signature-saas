/**
 * Terminal (blocked) state mapping for the link-share recipient.
 *
 * Asserts the contract the recipient's dead-end screens run on: the server's
 * HTTP codes (410/403/404) map to the right terminal reason, and each reason
 * carries the right tone (expired / invalid / disabled / not-fillable =
 * neutral, already-submitted = success) and the right catalog copy. This is the
 * receiver counterpart to the backend `link-state.spec.ts`, pinned on the client
 * side where the screen is actually chosen.
 *
 * The copy itself is asserted through the catalog rather than against a second
 * copy of the strings: `SHARE_NOTICE` holds keys, so what is worth pinning here
 * is that each reason points at *its own* notice and that both locales resolve.
 */

import { ApiError } from './api';
import {
  metaBlockReason,
  unlockBlockReason,
  SHARE_NOTICE,
  type ShareBlockReason,
} from './share-recipient';
import { translateWeb } from './web-translations';

const apiError = (status: number) => new ApiError('boom', status);

describe('metaBlockReason — pre-auth meta failure → terminal reason', () => {
  it('maps 410 Gone to expired (past its validity window)', () => {
    expect(metaBlockReason(apiError(410))).toBe('expired');
  });

  it('maps 404 Not Found to invalidLink (missing token / not a LINK)', () => {
    expect(metaBlockReason(apiError(404))).toBe('invalidLink');
  });

  it('maps 403 Forbidden to disabled (revoked by the sender)', () => {
    expect(metaBlockReason(apiError(403))).toBe('disabled');
  });

  it('falls back to invalidLink for any other status', () => {
    expect(metaBlockReason(apiError(500))).toBe('invalidLink');
    expect(metaBlockReason(apiError(401))).toBe('invalidLink');
  });

  it('falls back to invalidLink for a non-ApiError throwable', () => {
    expect(metaBlockReason(new Error('network'))).toBe('invalidLink');
    expect(metaBlockReason(undefined)).toBe('invalidLink');
  });
});

describe('unlockBlockReason — open-link auto-unlock failure → terminal reason', () => {
  it('maps 403 Forbidden to notSignable (no longer fillable; meta already cleared expiry/revocation)', () => {
    expect(unlockBlockReason(apiError(403))).toBe('notSignable');
  });

  it('falls back to invalidLink for any other status', () => {
    // Expiry/revocation are caught at meta; an unexpected code here is treated as invalid.
    expect(unlockBlockReason(apiError(410))).toBe('invalidLink');
    expect(unlockBlockReason(apiError(404))).toBe('invalidLink');
    expect(unlockBlockReason(apiError(500))).toBe('invalidLink');
  });

  it('falls back to invalidLink for a non-ApiError throwable', () => {
    expect(unlockBlockReason('nope')).toBe('invalidLink');
  });
});

describe('SHARE_NOTICE — tone + copy per terminal reason', () => {
  it('covers every block reason exactly once', () => {
    const reasons: ShareBlockReason[] = [
      'expired',
      'disabled',
      'invalidLink',
      'notSignable',
      'alreadySubmitted',
    ];
    expect(Object.keys(SHARE_NOTICE).sort()).toEqual([...reasons].sort());
  });

  it('uses a calm neutral tone for every non-openable dead-end', () => {
    expect(SHARE_NOTICE.expired.tone).toBe('neutral');
    expect(SHARE_NOTICE.disabled.tone).toBe('neutral');
    expect(SHARE_NOTICE.invalidLink.tone).toBe('neutral');
    expect(SHARE_NOTICE.notSignable.tone).toBe('neutral');
  });

  it('uses a success tone only for an already-submitted (completed) link', () => {
    expect(SHARE_NOTICE.alreadySubmitted.tone).toBe('success');
  });

  it('gives every reason its own notice in the share domain', () => {
    const keys = (Object.keys(SHARE_NOTICE) as ShareBlockReason[]).flatMap((reason) => [
      SHARE_NOTICE[reason].titleKey,
      SHARE_NOTICE[reason].bodyKey,
    ]);

    expect(keys.every((key) => key.startsWith('share.notice'))).toBe(true);
    // A duplicated key would mean two different dead-ends read identically.
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves the expired-link notice in both locales', () => {
    // The expired notice tells the recipient it is time (not their fault) and
    // offers the one next step — request a new link.
    expect(translateWeb('ko', SHARE_NOTICE.expired.titleKey)).toBe('링크가 만료됐어요');
    expect(translateWeb('ko', SHARE_NOTICE.expired.bodyKey)).toContain('새 링크를 요청');
    expect(translateWeb('en', SHARE_NOTICE.expired.titleKey)).toBe('This link has expired');
    expect(translateWeb('en', SHARE_NOTICE.expired.bodyKey)).toContain(
      'Ask the sender for a new link',
    );
  });
});
