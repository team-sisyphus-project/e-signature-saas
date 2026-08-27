/**
 * The one place that knows where the catalogs live.
 *
 * Both halves of the product author their own copy and measure their own
 * coverage — `apps/web/src/lib/i18n/coverage.ts` and
 * `apps/api/src/i18n/translation-coverage.ts`. This module reads them and
 * nothing else, so the rest of the tool stays a pure function of data: when a
 * catalog moves, exactly one file here changes.
 *
 * Reaching into two apps' sources is deliberate for repo-level tooling. The
 * alternative — each app publishing a coverage artifact for a merger to pick up
 * — adds a build step and a staleness question ("was that JSON regenerated?")
 * to answer a question we can answer from the source of truth directly.
 */

import { serverTranslationCoverage } from '../../../apps/api/src/i18n/translation-coverage';
import {
  formatCoverageReport,
  webTranslationCoverage,
} from '../../../apps/web/src/lib/i18n/coverage';
import type { SurfaceCoverage } from './report';

/**
 * Coverage of both shipped catalogs, web first.
 *
 * `formatCoverageReport` renders both surfaces even though it lives with the
 * web catalog: the two coverage shapes are the same shape by design (grain-1
 * mirrored it on purpose), and one renderer is what stops the same gap from
 * reading two different ways depending on which half it came from.
 */
export function collectSurfaces(): SurfaceCoverage[] {
  const web = webTranslationCoverage();
  const server = serverTranslationCoverage();

  return [
    { surface: 'web', coverage: web, text: formatCoverageReport(web) },
    { surface: 'server', coverage: server, text: formatCoverageReport(server) },
  ];
}
