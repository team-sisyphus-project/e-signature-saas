/**
 * Entry-level sweep: what a logged-out visitor actually reads.
 *
 * `locale.test.ts` proves the resolution *rule*, `public-entry-wiring.test.ts`
 * proves the wiring that feeds it, and `public-flow-copy.test.ts` proves the
 * catalog renders in a locale someone hands it. None of them starts where the
 * visitor starts. This file does: it takes the two entry conditions Spec M-2
 * names — the sender is set to English, or the browser is — runs them through
 * `resolvePublicEntryLocale`, and renders every string the signing and share
 * screens can show *in the locale that came out*.
 *
 * That composition is the point. A test that renders `'en'` copy passes even
 * when the sender tier has been dropped and every real English entry opens in
 * Korean; only a sweep whose locale is *derived from the entry* fails for that.
 * The controls at the bottom pin both halves: the same sweep at a Korean entry
 * must come back full of Hangul (so the matcher is live and the sweep is not
 * rendering an empty key set), and dropping the sender tier from an English
 * sender's entry must flip the screen back to Korean (so the English result is
 * owed to that tier rather than to a coincidence downstream).
 *
 * The key universe is assembled from three independent places rather than a
 * hand-kept list: both public catalog domains, the `FillCopy` maps the shared
 * viewer/capture-sheet/completion components are fed through, and the key
 * literals named in the public screens' own source (which is how the borrowed
 * `common.*` download rows get in). No DOM is involved — the screens' copy is
 * reached through the same catalog call the components make, so this stays a
 * plain unit test in the node environment (see `jest.config.js`).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

import { COMPLETION_ARTIFACTS, COMPLETION_ARTIFACT_KEYS } from './completion-download';
import { SHARE_FILL_COPY, SIGNER_FILL_COPY, type FillCopy } from './fill-copy';
import { collectSourceFiles } from './i18n/hangul-scan';
import { SHARE_TRANSLATIONS } from './i18n/share';
import { SIGNER_TRANSLATIONS } from './i18n/signer';
import {
  resolvePublicEntryLocale,
  type PublicEntryLocaleInput,
  type SupportedLocale,
} from './locale';
import { downloadSignerArtifact } from './signing';
import {
  UNKNOWN_WEB_TRANSLATION_FALLBACK,
  createWebTranslationRuntime,
  type WebTranslationKey,
} from './web-translations';

/** Hangul syllables plus compatibility jamo — copy that never got translated. */
const HANGUL = /[가-힣ㄱ-ㆎ]/;

/** A `{slot}` the render left standing, i.e. a hole in a sentence. */
const UNFILLED_SLOT = /\{\w+\}/;

const SRC_ROOT = path.resolve(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

/** Collapse formatting so source assertions survive a Prettier run. */
function normalize(code: string): string {
  return code.replace(/\s+/g, ' ');
}

// --- the key universe -------------------------------------------------------

/** Screens a logged-out visitor can reach, as source trees and single files. */
const PUBLIC_SCREEN_TREES = ['components/signer', 'components/share', 'app/sign', 'app/share'];
const PUBLIC_SCREEN_FILES = ['components/completion-download.tsx'];

/** Shape of a fully qualified key of a domain these screens read. */
const SCREEN_KEY = /^(?:common|signer|share)\.[A-Za-z0-9_]+$/;

/**
 * Catalog keys named as string literals in one source file.
 *
 * Parsed rather than grepped, for the reason `hangul-scan.ts` parses: only nodes
 * that can reach a screen are visited, so a key mentioned in a comment is not
 * mistaken for one the screen renders.
 */
function screenKeysIn(fileName: string, sourceText: string): WebTranslationKey[] {
  const parsed = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const keys: WebTranslationKey[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      SCREEN_KEY.test(node.text)
    ) {
      keys.push(node.text as WebTranslationKey);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(parsed, visit);
  return keys;
}

/** Every catalog key the public screens name directly in their own source. */
const SCREEN_KEYS: readonly WebTranslationKey[] = [
  ...new Set(
    [
      ...PUBLIC_SCREEN_TREES.flatMap((tree) =>
        collectSourceFiles(path.join(SRC_ROOT, tree), SRC_ROOT),
      ),
      ...PUBLIC_SCREEN_FILES,
    ].flatMap((file) => screenKeysIn(file, source(file))),
  ),
].sort();

/** Flatten a flow's copy map to the keys it will ask the catalog for. */
function keysOf(copy: FillCopy): WebTranslationKey[] {
  return [
    copy.ctaContinue,
    copy.ctaComplete,
    copy.loadError,
    copy.pageError,
    copy.progress,
    copy.progressNone,
    copy.progressAllDone,
    copy.completeError,
    ...Object.values(copy.fieldAffordance),
    ...Object.values(copy.sheet.title),
    ...Object.values(copy.sheet.hint),
    copy.sheet.modeDraw,
    copy.sheet.modeType,
    copy.sheet.modeLabel,
    copy.sheet.padLabel,
    copy.sheet.typeHint,
    copy.sheet.typePlaceholder,
    copy.sheet.fontLabel,
    copy.sheet.dateLabel,
    copy.sheet.textLabel,
    copy.sheet.textPlaceholder,
    copy.sheet.reset,
    copy.sheet.apply,
    copy.sheet.close,
    copy.sheet.saveError,
    ...Object.values(copy.done),
  ];
}

/** Both artifact rows of the completion takeover: title and description. */
const ARTIFACT_KEYS: readonly WebTranslationKey[] = COMPLETION_ARTIFACTS.flatMap((kind) => [
  COMPLETION_ARTIFACT_KEYS[kind].title,
  COMPLETION_ARTIFACT_KEYS[kind].description,
]);

/** Everything a signer or share recipient can be shown, from three sources. */
const SWEPT_KEYS: readonly WebTranslationKey[] = [
  ...new Set<WebTranslationKey>([
    ...Object.keys(SIGNER_TRANSLATIONS).map((key) => `signer.${key}` as WebTranslationKey),
    ...Object.keys(SHARE_TRANSLATIONS).map((key) => `share.${key}` as WebTranslationKey),
    ...keysOf(SIGNER_FILL_COPY),
    ...keysOf(SHARE_FILL_COPY),
    ...ARTIFACT_KEYS,
    ...SCREEN_KEYS,
  ]),
].sort();

/**
 * A value for every slot these keys interpolate.
 *
 * All English on purpose: contract titles, sender names and timestamps are the
 * sender's own words and are never translated (Spec exclusions), so seeding
 * Korean here would fail the sweep for a reason that is not a defect — and a
 * test that fails for non-defects is a test that gets ignored. A key that grows
 * a *new* slot is caught: its value renders with a literal `{slot}` left in it.
 */
const SLOT_VALUES = {
  page: 2,
  total: 3,
  done: 1,
  label: 'Signature',
  name: 'Acme',
  completedAt: '2026.08.27 10:00 (KST)',
} as const;

interface SweepResult {
  rendered: readonly (readonly [WebTranslationKey, string])[];
  /** Keys the runtime could not serve from the requested locale, plus why. */
  borrowed: readonly { key: WebTranslationKey; reason: string }[];
}

/** Render every swept key in `locale` on an isolated runtime. */
function sweep(locale: SupportedLocale): SweepResult {
  const runtime = createWebTranslationRuntime();
  const rendered = SWEPT_KEYS.map(
    (key) => [key, runtime.translate(locale, key, SLOT_VALUES)] as const,
  );
  const borrowed = runtime
    .getFallbackReport()
    .entries.map(({ key, reason }) => ({ key, reason }));
  return { rendered, borrowed };
}

function keysWhere(
  { rendered }: SweepResult,
  predicate: (copy: string) => boolean,
): WebTranslationKey[] {
  return rendered.filter(([, copy]) => predicate(copy)).map(([key]) => key);
}

/** The message a rejected promise carried, or null if it resolved. */
async function rejectionMessage(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// --- the entries Spec M-2 names ---------------------------------------------

interface PublicEntry {
  name: string;
  input: PublicEntryLocaleInput;
}

/**
 * Logged-out entries that must land in English. Two families, both from M-2:
 * the sender is set to English (whatever the browser says), or the sender said
 * nothing usable and the browser is English.
 */
const ENGLISH_ENTRIES: readonly PublicEntry[] = [
  {
    name: 'sender set to English, signer browsing in Korean',
    input: { senderLocale: 'en', browserLanguages: ['ko-KR', 'ko'] },
  },
  {
    name: 'sender set to English, browser offering no supported language',
    input: { senderLocale: 'en-GB', browserLanguages: ['fr-FR'] },
  },
  {
    name: 'sender with no stored preference, browser in English',
    input: { senderLocale: null, browserLanguages: ['en-US', 'en'] },
  },
  {
    name: 'sender on a language we do not publish, browser in English',
    input: { senderLocale: 'ja', browserLanguages: ['en-GB', 'ko'] },
  },
  {
    name: 'no sender row at all, browser in English',
    input: { browserLanguages: ['en'] },
  },
];

describe.each(ENGLISH_ENTRIES)('logged-out entry: $name', ({ input }) => {
  const locale = resolvePublicEntryLocale(input);

  it('resolves the entry to English', () => {
    expect(locale).toBe('en');
  });

  it('shows no Korean anywhere on the signing or share screens', () => {
    expect(keysWhere(sweep(locale), (copy) => HANGUL.test(copy))).toEqual([]);
  });

  it('leaves no slot unfilled and no line blank', () => {
    const result = sweep(locale);
    expect(keysWhere(result, (copy) => UNFILLED_SLOT.test(copy))).toEqual([]);
    expect(keysWhere(result, (copy) => copy.trim() === '')).toEqual([]);
  });

  it('borrows no line from another catalog', () => {
    // A key with no English copy is served from Korean *and still renders*, so
    // the rendered string cannot reveal it — the runtime's report can.
    const result = sweep(locale);
    expect(result.borrowed).toEqual([]);
    expect(keysWhere(result, (copy) => copy === UNKNOWN_WEB_TRANSLATION_FALLBACK)).toEqual([]);
  });

  it('labels both artifact downloads in English', () => {
    const runtime = createWebTranslationRuntime();
    const t = (key: WebTranslationKey) => runtime.translate(locale, key, SLOT_VALUES);

    // Named exactly, not just Hangul-free: these two labels are also the words
    // that end up in the saved file's name.
    expect(t(COMPLETION_ARTIFACT_KEYS.signed.title)).toBe('Signed contract');
    expect(t(COMPLETION_ARTIFACT_KEYS.certificate.title)).toBe('Audit trail certificate');
    // Both rows in full: the description under each title is read too.
    const korean = ARTIFACT_KEYS.filter((key) => HANGUL.test(t(key)));
    expect(korean).toEqual([]);
  });

  it('refuses the artifact download in English when the session has gone', async () => {
    // The one download failure the client authors itself; every other rejection
    // is the server's sentence, which `public-flow-messages.spec.ts` owns.
    const message = await rejectionMessage(
      downloadSignerArtifact('access-token', 'signed', 'Service agreement', locale),
    );

    expect(message).toBe(SIGNER_TRANSLATIONS.completeError.en);
    expect(HANGUL.test(message ?? '')).toBe(false);
  });
});

// --- the sweep must be able to fail -----------------------------------------

describe('the sweep is not vacuous', () => {
  it('reads keys out of the public screens themselves', () => {
    // The source scan is the only part of the key universe that can silently
    // degrade to nothing (a moved directory, a changed call shape). Anchors
    // from three different screens, so one rename cannot hollow it out.
    expect(SCREEN_KEYS.length).toBeGreaterThan(20);
    expect(SCREEN_KEYS).toContain('signer.verifyTitle');
    expect(SCREEN_KEYS).toContain('share.gateTitle');
    expect(SCREEN_KEYS).toContain('common.completionTitle');
  });

  it('sweeps every published key of both public domains, plus what they borrow', () => {
    for (const key of Object.keys(SIGNER_TRANSLATIONS)) {
      expect(SWEPT_KEYS).toContain(`signer.${key}`);
    }
    for (const key of Object.keys(SHARE_TRANSLATIONS)) {
      expect(SWEPT_KEYS).toContain(`share.${key}`);
    }
    for (const key of [...keysOf(SIGNER_FILL_COPY), ...keysOf(SHARE_FILL_COPY), ...ARTIFACT_KEYS]) {
      expect(SWEPT_KEYS).toContain(key);
    }
  });

  it('finds Korean when the entry resolves to Korean', () => {
    // The positive control for the Hangul matcher: if the sweep rendered an
    // empty key set, or stopped reaching real copy, this fails first.
    const korean = resolvePublicEntryLocale({ senderLocale: 'ko', browserLanguages: ['en-US'] });
    expect(korean).toBe('ko');

    const hangulKeys = keysWhere(sweep(korean), (copy) => HANGUL.test(copy));
    expect(hangulKeys.length).toBeGreaterThan(SWEPT_KEYS.length / 2);
  });
});

describe('the English screen is owed to the sender tier', () => {
  const entry = { senderLocale: 'en', browserLanguages: ['ko-KR', 'ko'] } as const;

  it('opens in Korean the moment the sender tier stops being consulted', () => {
    expect(resolvePublicEntryLocale(entry)).toBe('en');

    // Exactly what "the sender tier is ignored" means, expressed as input: the
    // remaining tiers answer Korean, and the screen follows.
    const { senderLocale: _ignored, ...withoutSender } = entry;
    expect(resolvePublicEntryLocale(withoutSender)).toBe('ko');
    expect(keysWhere(sweep(resolvePublicEntryLocale(withoutSender)), (copy) =>
      HANGUL.test(copy),
    ).length).toBeGreaterThan(0);
  });
});

describe('the saved artifact file is named in the entry language', () => {
  it('resolves the artifact label through the catalog at the caller’s locale', () => {
    const code = normalize(source('lib/signing.ts'));
    expect(code).toContain('translateWeb(locale, COMPLETION_ARTIFACT_KEYS[kind].title)');
  });

  it('is handed the locale the entry resolved to, not a fixed one', () => {
    // The positive control for the assertion above: a correct label built from
    // a locale nobody resolved would still read Korean for an English signer.
    const code = normalize(source('components/signer/signer-context.tsx'));
    expect(code).toContain('locale } = useLocale()');
    expect(code).toContain('downloadSignerArtifact(token, kind, documentTitle, locale)');
  });
});
