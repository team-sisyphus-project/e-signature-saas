#!/usr/bin/env node
/**
 * `pnpm i18n:report` — write the merged missing-key report.
 *
 * On demand, not as a side effect of a test run: the list is evidence someone
 * has to be able to produce and hand over, and a `console.log` inside a suite is
 * only evidence to whoever was watching that suite.
 *
 * Usage:
 *   pnpm i18n:report                      # repo root / i18n-missing-keys.json (+ .txt)
 *   pnpm i18n:report -- --out path.json   # anywhere; relative to the shell's cwd
 *   I18N_REPORT_OUT=path.json pnpm i18n:report
 *
 * Exit code is 0 even when keys are missing. Turning gaps into a build failure
 * is a CI gate, and a gate belongs where the pipeline can see it — not welded
 * onto the tool that produces the list.
 */

import { resolve } from 'node:path';
import { collectSurfaces } from './collect';
import { countLabel, writeMissingKeyReport } from './report';

/** Default artifact name, resolved against the repo root. */
export const DEFAULT_REPORT_FILENAME = 'i18n-missing-keys.json';

/** `packages/i18n-report/src` → repo root. */
const REPO_ROOT = resolve(__dirname, '../../..');

/**
 * Where to write, in falling precedence: `--out`, `I18N_REPORT_OUT`, default.
 *
 * The flag and the variable are resolved against the caller's cwd because that
 * is where a person typing a relative path means it; only the default is
 * anchored to the repo root, so `pnpm i18n:report` lands in the same place no
 * matter which package pnpm ran it from.
 */
export function resolveOutputPath(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
): string {
  const flag = argv.indexOf('--out');
  const fromFlag = flag === -1 ? undefined : argv[flag + 1];

  if (flag !== -1 && !fromFlag) throw new Error('--out requires a path');
  if (fromFlag) return resolve(cwd, fromFlag);

  const fromEnv = env.I18N_REPORT_OUT?.trim();
  if (fromEnv) return resolve(cwd, fromEnv);

  return resolve(REPO_ROOT, DEFAULT_REPORT_FILENAME);
}

function main(): void {
  const jsonPath = resolveOutputPath(process.argv.slice(2), process.env, process.cwd());
  const { report, textPath } = writeMissingKeyReport(collectSurfaces(), { jsonPath });

  for (const surface of report.summary.surfaces) {
    console.log(
      `${surface.surface}: ${countLabel(surface.totalKeys, 'key')}, ` +
        `${countLabel(surface.gapCount, 'gap')}` +
        (surface.undeclaredEntryCount > 0
          ? `, ${countLabel(surface.undeclaredEntryCount, 'undeclared entry', 'undeclared entries')}`
          : ''),
    );
  }

  console.log(
    report.summary.gapCount === 0
      ? 'no missing keys'
      : `${countLabel(report.summary.gapCount, 'gap')} across ${countLabel(
          report.summary.missingKeyCount,
          'key',
        )}`,
  );
  console.log(`wrote ${jsonPath}${textPath ? ` and ${textPath}` : ''}`);
}

// Guarded so the path resolution above can be imported and tested without the
// import itself writing a file somewhere.
if (require.main === module) main();
