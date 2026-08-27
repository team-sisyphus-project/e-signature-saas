/**
 * Source scanner for Hangul that escaped the catalog.
 *
 * The i18n migration is only finished once *adding* Korean back is hard. Types
 * already stop a key from shipping in one locale (`WebTranslationEntry`), and
 * the runtime already reports a missing lookup — but neither notices a sentence
 * that never became a key at all. That is what this module sees.
 *
 * It parses each file with the TypeScript compiler and inspects only the nodes
 * that can *reach a screen*: string literals, template literals, and JSX text.
 * Comments, identifiers and type names are not visited, so Korean prose
 * explaining why a decision was made stays welcome — it is written for the next
 * engineer, not for a user, and banning it would only push documentation out of
 * the code.
 *
 * The scan is intentionally a static, offline pass over source text: it needs no
 * browser, no rendering, and no network, so it runs as an ordinary unit test.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/** Hangul syllables plus the compatibility jamo block (`ㄱ`, `ㅏ`, …). */
const HANGUL = /[가-힣ㄱ-ㆎ]/;

/** File extensions that can carry rendered copy. */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

/** Directories never worth walking into. */
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);

/** One Hangul-bearing literal, located precisely enough to fix. */
export interface HangulFinding {
  /** Path relative to the scan root, with forward slashes. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** Which kind of node carried it. */
  kind: 'string' | 'template' | 'jsx-text';
  /** The offending text, collapsed to one line and truncated for readability. */
  text: string;
}

/** A file exempted from the scan, with the reason it is exempt. */
export interface HangulAllowlistEntry {
  /** Path relative to the repository root, with forward slashes. */
  file: string;
  /** Why Korean is legitimate here. Required — an unexplained exemption rots. */
  reason: string;
}

const MAX_EXCERPT = 80;

function excerpt(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_EXCERPT ? `${collapsed.slice(0, MAX_EXCERPT)}…` : collapsed;
}

/**
 * Hangul-bearing literals in one source file.
 *
 * `fileName` is used verbatim in the findings, so callers pass the path they
 * want reported (typically repo-relative).
 */
export function scanSourceForHangul(fileName: string, sourceText: string): HangulFinding[] {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const findings: HangulFinding[] = [];

  const report = (node: ts.Node, kind: HangulFinding['kind'], text: string) => {
    if (!HANGUL.test(text)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    findings.push({ file: fileName, line: line + 1, kind, text: excerpt(text) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      report(node, 'string', node.text);
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      // Only the literal spans of a template are copy; the `${}` expressions are
      // visited on their own and judged by the same rules.
      report(node, 'template', node.text);
    } else if (ts.isJsxText(node)) {
      report(node, 'jsx-text', node.text);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return findings;
}

/** Every `.ts`/`.tsx` file under `root`, as paths relative to `repoRoot`. */
export function collectSourceFiles(root: string, repoRoot: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(path.relative(repoRoot, full).split(path.sep).join('/'));
      }
    }
  };

  walk(root);
  return files.sort();
}

/**
 * Scan every source file under `roots`, skipping allowlisted paths.
 *
 * Returns findings sorted by file then line, so a failure message reads in the
 * order someone would fix them.
 */
export function scanTreeForHangul(
  roots: readonly string[],
  repoRoot: string,
  allowlist: readonly HangulAllowlistEntry[],
): HangulFinding[] {
  const exempt = new Set(allowlist.map((entry) => entry.file));
  const findings: HangulFinding[] = [];

  for (const root of roots) {
    for (const file of collectSourceFiles(root, repoRoot)) {
      if (exempt.has(file)) continue;
      findings.push(
        ...scanSourceForHangul(file, fs.readFileSync(path.join(repoRoot, file), 'utf8')),
      );
    }
  }

  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** One finding per line, in a shape an editor can jump to. */
export function formatHangulFindings(findings: readonly HangulFinding[]): string {
  return findings.map((f) => `${f.file}:${f.line} [${f.kind}] ${f.text}`).join('\n');
}
