import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import {
  API_GLOBAL_PREFIX,
  API_UNPREFIXED_ROUTES,
  createNextRequestHandler,
  createWebFallbackMiddleware,
  findWebAppDir,
  hasNextBuild,
  resolveServerPort,
} from './web-host';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve the built web app from this same process so the deployment exposes a
  // single plain-HTTP port (TLS is terminated upstream). The middleware is
  // registered before `app.init()` — Nest installs its own JSON 404 handler
  // during init, so anything appended after it would never run — and it hands
  // over only the paths no API route owns.
  const webAppDir = findWebAppDir(__dirname);
  const serveWeb = hasNextBuild(webAppDir);
  if (webAppDir && serveWeb) {
    const handleWebRequest = await createNextRequestHandler(webAppDir);
    app.getHttpAdapter().getInstance().use(createWebFallbackMiddleware(handleWebRequest));
  }

  // Captured signature values arrive as base64 image dataURLs, which exceed
  // the 100kb body-parser default. Raise the JSON limit so the signer's
  // `POST /signing/:token/fields` request is accepted.
  app.useBodyParser('json', { limit: '8mb' });
  app.useBodyParser('urlencoded', { limit: '8mb', extended: true });

  // Allow the web app (and signer pages) to call the API during development.
  // When both are served from this process the calls are same-origin and CORS
  // never comes into play.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
    // Let the browser read the artifact filename on cross-origin downloads.
    exposedHeaders: ['Content-Disposition'],
  });
  app.setGlobalPrefix(API_GLOBAL_PREFIX, { exclude: API_UNPREFIXED_ROUTES });

  // Validate + strip unknown properties on every DTO-bound request body.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableShutdownHooks();

  const port = resolveServerPort();
  await app.listen(port);
  Logger.log(
    serveWeb
      ? `API + web listening on http://localhost:${port}`
      : `API listening on http://localhost:${port} (no web build — API only)`,
    'Bootstrap',
  );
}

void bootstrap();
