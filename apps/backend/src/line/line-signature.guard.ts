import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateSignature, LINE_SIGNATURE_HTTP_HEADER_NAME } from '@line/bot-sdk';

type RawRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
};

@Injectable()
export class LineSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawRequest>();
    const headerValue = req.headers[LINE_SIGNATURE_HTTP_HEADER_NAME];
    const signature = typeof headerValue === 'string' ? headerValue : null;
    const secret = this.config.getOrThrow<string>('LINE_CHANNEL_SECRET');

    if (!signature || !req.rawBody) {
      throw new UnauthorizedException();
    }

    if (!validateSignature(req.rawBody, secret, signature)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
