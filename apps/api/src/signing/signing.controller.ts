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
import { attachmentDisposition } from '../common/http';
import type { PublicLocaleHints } from '../i18n/locale-resolver';
import { CurrentSigner } from './current-signer.decorator';
import { SignerSessionGuard } from './signer-session.guard';
import type { SignerSession } from './signer-session.service';
import { SigningService } from './signing.service';
import { SaveFieldValuesDto, VerifyCodeDto } from './dto/signing.dto';

/**
 * Public (JWT-free) signing endpoints keyed by SignRequest.accessToken.
 *
 * Routed under the global `/api` prefix → `/api/signing/:token/...`.
 * `:token` is the SignRequest access token embedded in the signing link.
 * The session-guarded routes additionally require a short-lived signer token.
 *
 * Nobody here is logged in, so every route also collects the two locale tiers
 * the request carries — the link's `?lang=` and the browser's `Accept-Language`
 * — and hands them to the service, which adds the sender tier from the row it
 * loads. Errors are answered in the visitor's language, not the server's.
 */
@Controller('signing')
export class SigningController {
  constructor(private readonly signing: SigningService) {}

  /**
   * ① Pre-auth minimal metadata (no PDF / fields).
   *
   * `?lang=` is the locale carried by the signing link itself. It is forwarded
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
    return this.signing.meta(token, acceptLanguage, lang);
  }

  /** ② Verify the 6-digit code → issue a short-lived signer session token. */
  @Post(':token/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Param('token') token: string,
    @Body() dto: VerifyCodeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.signing.verify(token, dto.code, ip, userAgent, hints(acceptLanguage, lang));
  }

  /** ③ Signer's fields + short-lived PDF path (session required). */
  @Get(':token/payload')
  @UseGuards(SignerSessionGuard)
  payload(
    @CurrentSigner() signer: SignerSession,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.signing.payload(signer.signRequestId, hints(acceptLanguage, lang));
  }

  /** ④ Stream the document PDF bytes (session required). */
  @Get(':token/pdf')
  @UseGuards(SignerSessionGuard)
  async pdf(
    @CurrentSigner() signer: SignerSession,
    @Res() res: Response,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const stream = await this.signing.openPdf(signer.signRequestId, hints(acceptLanguage, lang));
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
  @UseGuards(SignerSessionGuard)
  saveFields(
    @CurrentSigner() signer: SignerSession,
    @Body() dto: SaveFieldValuesDto,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.signing.saveFields(signer.signRequestId, dto, hints(acceptLanguage, lang));
  }

  /**
   * ⑦ Download a completed contract's artifact (session required).
   * `:artifact` is `signed` (최종 계약서) or `certificate` (감사 추적 인증서).
   * Only resolves once the document is COMPLETED and the artifacts are stored.
   *
   * The `:artifact` name is validated by the service, which is where the
   * sender's locale is known — a refusal written here could only be in the
   * server's language.
   */
  @Get(':token/download/:artifact')
  @UseGuards(SignerSessionGuard)
  async download(
    @CurrentSigner() signer: SignerSession,
    @Param('artifact') artifact: string,
    @Res() res: Response,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const { stream, filename } = await this.signing.openArtifact(
      signer.signRequestId,
      artifact,
      hints(acceptLanguage, lang),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', attachmentDisposition(filename));
    res.setHeader('Cache-Control', 'no-store');
    stream.on('error', () => {
      if (!res.headersSent) res.status(HttpStatus.NOT_FOUND);
      res.end();
    });
    stream.pipe(res);
  }

  /** ⑥ Finalize the signer's part (session required). */
  @Post(':token/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignerSessionGuard)
  complete(
    @CurrentSigner() signer: SignerSession,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.signing.complete(signer.signRequestId, ip, userAgent, hints(acceptLanguage, lang));
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
