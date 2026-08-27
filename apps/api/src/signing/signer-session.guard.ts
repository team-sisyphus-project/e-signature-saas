import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePublicEntryLocale } from '../i18n/locale-resolver';
import { publicLocaleHints } from '../i18n/request-locale';
import { translate } from '../i18n/server-translations';
import { SignerSessionService, type SignerSession } from './signer-session.service';

/**
 * Protects the signer-only endpoints (payload / pdf / fields / complete).
 *
 * Validates the short-lived bearer session token AND re-checks that the token
 * is bound to the very SignRequest addressed by the `:token` (accessToken)
 * route param — so a session for one signing link can never read another.
 *
 * The link is resolved *before* the session token so the refusal can be written
 * in the visitor's language: the sender tier lives on that row, and this guard
 * is the only place these two messages are produced. The read is the same
 * indexed lookup the public landing endpoint already performs for anyone
 * holding the link, so it exposes nothing new.
 */
@Injectable()
export class SignerSessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SignerSessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request<{ token: string }> & { signer: SignerSession }>();

    const hints = publicLocaleHints(request);
    const accessToken = request.params?.token;
    if (!accessToken) {
      throw new NotFoundException(
        translate(resolvePublicEntryLocale(hints), 'signing.invalidLink'),
      );
    }

    const signRequest = await this.prisma.signRequest.findUnique({
      where: { accessToken },
      select: { id: true, document: { select: { owner: { select: { locale: true } } } } },
    });
    if (!signRequest) {
      throw new NotFoundException(
        translate(resolvePublicEntryLocale(hints), 'signing.invalidLink'),
      );
    }

    const locale = resolvePublicEntryLocale({
      ...hints,
      // Optional chaining, not certainty: the select above promises the sender,
      // but this row also arrives from doubles and from older callers.
      senderLocale: signRequest.document?.owner?.locale,
    });
    const session = this.sessions.verify(extractBearer(request.headers.authorization), locale);

    // The session must belong to the link being accessed.
    if (signRequest.id !== session.signRequestId) {
      throw new UnauthorizedException(translate(locale, 'signing.sessionExpired'));
    }

    request.signer = { signRequestId: signRequest.id };
    return true;
  }
}

function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return undefined;
  return value.trim();
}
