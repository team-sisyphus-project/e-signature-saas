import { Controller, Get, Header, Headers, Param, Query } from '@nestjs/common';
import { parseLocale, resolveLocale, type SupportedLocale } from './locale-resolver';
import { SERVER_TRANSLATIONS } from './server-translations';

/** Read-only resource endpoint for browser clients. */
@Controller('i18n')
export class I18nController {
  /**
   * Serve the catalog for `:locale`, negotiating it when that request cannot be
   * honoured.
   *
   * The path segment is the caller's explicit request and therefore wins. When
   * it names a locale we do not publish (`/i18n/resources/fr`, a stale bookmark,
   * a typo), the request is negotiated instead of silently downgraded: the
   * link's own `?lang=` gets a say, then the browser's `Accept-Language`, and
   * Korean stays the last resort. Handing the Korean catalog to a browser that
   * only reads English is a worse answer than handing it the English one.
   *
   * Everything below the path tier is delegated to the shared resolver, so this
   * endpoint cannot drift from the precedence used by the signing and share
   * boundaries.
   *
   * `Vary` is required because the body now depends on the request headers: a
   * cache that ignored it would serve one browser's negotiated catalog to the
   * next browser.
   */
  @Get('resources/:locale')
  @Header('Vary', 'Accept-Language')
  resources(
    @Param('locale') locale: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') linkLocale?: string,
  ) {
    const resolved: SupportedLocale =
      parseLocale(locale) ?? resolveLocale({ linkLocale, acceptLanguage });
    return { locale: resolved, resources: SERVER_TRANSLATIONS[resolved] };
  }
}
