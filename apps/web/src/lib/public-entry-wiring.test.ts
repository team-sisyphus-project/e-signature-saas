/**
 * Wiring guard for the logged-out entry path.
 *
 * `locale.test.ts` proves the *rule* — sender before browser, no signed-in tier.
 * A rule is only worth its wiring, and the two defects this grain fixed both
 * lived in the wiring rather than the rule: the sender tier was fed
 * `meta.locale` (a value the server had already resolved, so it could never be
 * absent and the browser tier below it could never win), and each public
 * context invented a Korean sender out of thin air while metadata was still in
 * flight.
 *
 * Neither is reachable from a pure function, and this suite runs in a DOM-free
 * node environment on purpose (see `jest.config.js`) — so the invariant is
 * asserted against the source itself, the same technique
 * `lib/i18n/no-hardcoded-hangul.test.ts` uses to keep Korean out of components.
 * A source assertion is a coarse instrument; it is used here only for
 * invariants that have no runtime seam, and each one below is paired with a
 * positive control so it cannot be satisfied by deleting the feature.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_ROOT = path.resolve(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

/** Collapse formatting so the assertions survive a Prettier run. */
function normalize(code: string): string {
  return code.replace(/\s+/g, ' ');
}

/** The public-link flows, each owning one entry point a logged-out visitor uses. */
const PUBLIC_CONTEXTS = [
  { flow: 'signer (OTP link)', file: 'components/signer/signer-context.tsx' },
  { flow: 'share (link share)', file: 'components/share/share-context.tsx' },
] as const;

describe('public-link contexts feed the sender tier', () => {
  describe.each(PUBLIC_CONTEXTS)('$flow', ({ file }) => {
    const code = normalize(source(file));

    it("passes the sender's own stored preference", () => {
      expect(code).toContain('setSenderLocale(meta.sender.locale)');
    });

    it('never passes the locale the server already resolved', () => {
      // `meta.locale` is the server's answer, with the link parameter,
      // Accept-Language and the Korean default folded in. Handing it to the
      // sender tier re-asserts a decision the browser tier was meant to make.
      expect(code).not.toContain('setSenderLocale(meta.locale)');
    });

    it('clears the tier instead of guessing when metadata is unavailable', () => {
      // Both the failure path and the unmount cleanup must retract the sender
      // preference, or a second link inherits the first sender's language.
      expect(code).toContain('setSenderLocale(null)');
    });

    it('invents no sender language while metadata is in flight', () => {
      // The branding fallback answers "who sent this", not "in what language".
      expect(code).toMatch(/sender: state\.meta\?\.sender \?\? \{[^}]*\}/);
      expect(code).not.toMatch(/sender: state\.meta\?\.sender \?\? \{[^}]*locale:/);
    });
  });
});

describe('the locale provider drops the signed-in tier on a public link', () => {
  const code = normalize(source('components/locale-provider.tsx'));
  const branches = /publicLinkActive \? (.+?) : (.+?);/.exec(code);

  it('resolves the two entry paths through two different resolvers', () => {
    expect(branches).not.toBeNull();
  });

  it('sends a public link through the resolver that has no signed-in tier', () => {
    expect(branches?.[1]).toContain('resolvePublicEntryLocale(');
    expect(branches?.[1]).not.toContain('userLocale');
  });

  it('still honours a signed-in preference off the public path', () => {
    // The positive control: without this, deleting the user tier outright would
    // satisfy every assertion above.
    expect(branches?.[2]).toContain('resolveLocale(');
    expect(branches?.[2]).toContain('userLocale');
  });
});
