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
import { translate } from '../i18n/server-translations';
import { publicLocaleHints } from '../i18n/request-locale';
import { assertLinkAccessible } from './link-state';
import { ShareSessionService, type ShareSession } from './share-session.service';

/**
 * Protects the recipient-only share endpoints (payload / pdf / fields / submit).
 *
 * Validates the short-lived bearer share session token AND re-checks that:
 *   1. the token is bound to the very LINK SignRequest addressed by the
 *      `:token` (accessToken) route param — so a session for one link can
 *      never read another, and
 *   2. the link is still accessible (not expired, not revoked) — the
 *      expiry/revocation guard is therefore enforced on *every* session-gated
 *      request, not just at unlock time.
 *
 * The link is read before the session token is verified so every refusal here
 * can be written in the recipient's language: the sender tier lives on that
 * row. It is the same lookup the public landing endpoint already performs for
 * anyone holding the link.
 */
@Injectable()
export class ShareSessionGuard implements CanActivate {
  constructor(
    private readonly sessions: ShareSessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request<{ token: string }> & { share: ShareSession }>();

    const hints = publicLocaleHints(request);
    const accessToken = request.params?.token;
    if (!accessToken) {
      throw new NotFoundException(translate(resolvePublicEntryLocale(hints), 'share.invalidLink'));
    }

    const link = await this.prisma.signRequest.findUnique({
      where: { accessToken },
      select: {
        id: true,
        accessMode: true,
        status: true,
        linkExpiresAt: true,
        linkRevokedAt: true,
        document: { select: { owner: { select: { locale: true } } } },
      },
    });

    const locale = resolvePublicEntryLocale({
      // Optional chaining, not certainty: an unknown token yields no row at all,
      // and the sender tier is simply absent for the refusal below.
      ...hints,
      senderLocale: link?.document?.owner?.locale,
    });

    // 404 invalidLink (not a LINK / missing), 403 revoked, 410 expired.
    assertLinkAccessible(link, new Date(), locale);

    const session = this.sessions.verify(extractBearer(request.headers.authorization), locale);

    // The session must belong to the link being accessed.
    if (link!.id !== session.signRequestId) {
      throw new UnauthorizedException(translate(locale, 'share.sessionExpired'));
    }

    request.share = { signRequestId: link!.id };
    return true;
  }
}

function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return undefined;
  return value.trim();
}
