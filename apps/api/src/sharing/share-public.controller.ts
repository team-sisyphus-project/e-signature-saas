import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentShare } from './current-share.decorator';
import { ShareSessionGuard } from './share-session.guard';
import type { ShareSession } from './share-session.service';
import { SharingService } from './sharing.service';
import { UnlockShareLinkDto } from './dto/sharing.dto';
import { SaveFieldValuesDto } from '../signing/dto/signing.dto';
import type { PublicLocaleHints } from '../i18n/locale-resolver';

/**
 * Public (JWT-free) share-link endpoints keyed by the LINK SignRequest token.
 *
 * Routed under the global `/api` prefix → `/api/share/:token/...`. The
 * session-guarded routes additionally require a short-lived share token issued
 * by `/unlock`. Expiry/revocation is enforced on every path.
 *
 * Nobody here is logged in, so every route also collects the two locale tiers
 * the request carries — the link's `?lang=` and the browser's `Accept-Language`
 * — and hands them to the service, which adds the sender tier from the row it
 * loads. Errors are answered in the recipient's language, not the server's.
 */
@Controller('share')
export class SharePublicController {
  constructor(private readonly sharing: SharingService) {}

  /**
   * ① Pre-auth minimal metadata (no PDF / fields).
   *
   * `?lang=` is the locale carried by the share link itself. It is forwarded
   * verbatim — validation and precedence belong to `resolveLocale`, so an
   * unusable value falls through to the sender locale instead of being
   * rejected here and breaking an otherwise valid link.
   */
  @Get(':token')
  meta(
    @Param('token') token: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.sharing.meta(token, acceptLanguage, lang);
  }

  /** ② Unlock (verify password if set) → short-lived share session token. */
  @Post(':token/unlock')
  @HttpCode(HttpStatus.OK)
  unlock(
    @Param('token') token: string,
    @Body() dto: UnlockShareLinkDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.sharing.unlock(token, dto.password, ip, userAgent, hints(acceptLanguage, lang));
  }

  /** ③ Recipient's fields + short-lived PDF path (session required). */
  @Get(':token/payload')
  @UseGuards(ShareSessionGuard)
  payload(
    @Param('token') token: string,
    @CurrentShare() share: ShareSession,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.sharing.payload(share.signRequestId, token, hints(acceptLanguage, lang));
  }

  /** ④ Stream the document PDF bytes (session required). */
  @Get(':token/pdf')
  @UseGuards(ShareSessionGuard)
  async pdf(
    @CurrentShare() share: ShareSession,
    @Res() res: Response,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const stream = await this.sharing.openPdf(share.signRequestId, hints(acceptLanguage, lang));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    stream.on('error', () => {
      if (!res.headersSent) res.status(HttpStatus.NOT_FOUND);
      res.end();
    });
    stream.pipe(res);
  }

  /** ⑤ Persist captured field values (session required). */
  @Post(':token/fields')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ShareSessionGuard)
  saveFields(
    @CurrentShare() share: ShareSession,
    @Body() dto: SaveFieldValuesDto,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.sharing.saveFields(share.signRequestId, dto, hints(acceptLanguage, lang));
  }

  /** ⑥ Finalize the recipient's submission (session required). */
  @Post(':token/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ShareSessionGuard)
  submit(
    @CurrentShare() share: ShareSession,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.sharing.submit(share.signRequestId, ip, userAgent, hints(acceptLanguage, lang));
  }
}

/**
 * The locale tiers this request brought with it, forwarded unvalidated: which
 * tags are supported is the resolver's decision, so `?lang=fr` must fall
 * through to the sender rather than be reclassified here.
 */
function hints(acceptLanguage?: string, lang?: string): PublicLocaleHints {
  return { acceptLanguage, linkLocale: lang };
}
