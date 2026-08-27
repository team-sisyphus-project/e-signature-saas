import type { Request } from 'express';
import type { PublicLocaleHints } from './locale-resolver';

/** Query parameter carrying an explicit locale on a signing/share link. */
const LINK_LOCALE_PARAM = 'lang';

/**
 * The language tiers an anonymous request carries by itself: the link's own
 * `?lang=` and the browser's `Accept-Language`.
 *
 * Values are returned unvalidated on purpose — `resolvePublicEntryLocale` owns
 * which tags are supported, so `?lang=fr` must reach it as a spent tier and fall
 * through to the sender, rather than being reclassified into Korean here.
 *
 * This is for the guards, which receive the raw request. Controllers take the
 * same two values through `@Query`/`@Headers` and pass them on as hints.
 */
export function publicLocaleHints(request: Request): PublicLocaleHints {
  const lang = (request.query as Record<string, unknown> | undefined)?.[LINK_LOCALE_PARAM];
  return {
    linkLocale: typeof lang === 'string' ? lang : undefined,
    acceptLanguage: request.headers['accept-language'],
  };
}
