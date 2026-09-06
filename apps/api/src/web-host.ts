/**
 * Single-port hosting helpers for the API bootstrap.
 *
 * The deployment target gives this process one port (`$PORT`) behind a TLS
 * terminator and expects plain HTTP on it. So the Nest server owns that port
 * and — when the Next build is present next to it in the monorepo — also serves
 * the web app as a fallback behind the `/api` and `/health` routes.
 *
 * These helpers stay free of Nest and of `next` itself: `next` is a dependency
 * of the web workspace, not of the API, and is only ever resolved lazily from
 * that workspace so API-only mode works without it.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Port used when neither `PORT` nor `API_PORT` is provided. */
export const DEFAULT_PORT = 3001;

/** Environment variables consulted for the listen port, in priority order. */
const PORT_VARS = ['PORT', 'API_PORT'] as const;

const MAX_PORT = 65535;

/**
 * Resolve the TCP port to listen on: `PORT` (injected by the platform) wins,
 * then `API_PORT` (the local dev convention), then {@link DEFAULT_PORT}.
 *
 * A blank value counts as unset — an empty `PORT` in a `.env` file must not
 * shadow a real `API_PORT`. A value that is present but unusable is an error,
 * not a reason to silently listen on a port nobody is routing to.
 */
export function resolveServerPort(env: NodeJS.ProcessEnv = process.env): number {
  for (const name of PORT_VARS) {
    const raw = env[name]?.trim();
    if (!raw) continue;

    const port = Number(raw);
    if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
      throw new Error(`Invalid ${name}="${raw}": expected an integer between 0 and ${MAX_PORT}.`);
    }
    return port;
  }

  return DEFAULT_PORT;
}

/**
 * Locate the `apps/web` workspace by walking up from `startDir`.
 *
 * The API runs from `apps/api/dist` in production and `apps/api` in watch mode,
 * so the depth to the repo root is not fixed. Returns `null` when no web
 * workspace sits above the start directory (API-only deployment).
 */
export function findWebAppDir(startDir: string): string | null {
  let dir = startDir;

  for (;;) {
    const candidate = join(dir, 'apps', 'web');
    if (existsSync(join(candidate, 'package.json'))) return candidate;

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Whether `webDir` holds a completed production Next build. `BUILD_ID` is the
 * last artifact `next build` writes, so its presence means the build finished —
 * unlike `.next/`, which also exists after a bare `next dev` or a failed build.
 */
export function hasNextBuild(webDir: string | null): boolean {
  return webDir !== null && existsSync(join(webDir, '.next', 'BUILD_ID'));
}

/**
 * Nest's global route prefix. Every controller route lives under it, except the
 * routes in {@link API_UNPREFIXED_ROUTES}. `main.ts` configures the Nest app
 * from these same constants so the two can never drift apart.
 */
export const API_GLOBAL_PREFIX = 'api';

/** Routes served at the root, outside {@link API_GLOBAL_PREFIX}. */
export const API_UNPREFIXED_ROUTES: string[] = ['health'];

/**
 * Whether `pathname` belongs to the API rather than the web app.
 *
 * Matching is on the first path segment, lowercased because Express routing is
 * case-insensitive by default — `/API/documents` reaches the same controller as
 * `/api/documents` and must not be handed to the web app.
 */
export function isApiRequestPath(pathname: string): boolean {
  const firstSegment = (pathname.split('/')[1] ?? '').toLowerCase();

  return firstSegment === API_GLOBAL_PREFIX || API_UNPREFIXED_ROUTES.includes(firstSegment);
}

/** The subset of an Express request this module reads. */
type WebFallbackRequest = IncomingMessage & { path?: string };

/**
 * Wrap a web request handler so it only sees requests the API does not own.
 *
 * The guard is needed because Nest installs its own JSON "Cannot GET /" 404
 * handler while the app initialises: middleware appended afterwards is dead
 * code. So this is registered *ahead* of the Nest router and steps aside for
 * API paths instead of waiting to be reached last.
 */
export function createWebFallbackMiddleware(
  handleWebRequest: (req: IncomingMessage, res: ServerResponse) => void,
): (req: WebFallbackRequest, res: ServerResponse, next: () => void) => void {
  return (req, res, next) => {
    // `req.path` is set by Express; fall back to parsing so the middleware is
    // usable on a bare Node request too.
    const pathname = req.path ?? new URL(req.url ?? '/', 'http://localhost').pathname;

    if (isApiRequestPath(pathname)) {
      next();
      return;
    }

    handleWebRequest(req, res);
  };
}

/** Minimal shape of the `next` entrypoint this module depends on. */
type NextServer = {
  prepare(): Promise<void>;
  getRequestHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
};
type NextFactory = (options: { dev: boolean; dir: string }) => NextServer;

/**
 * Load and prepare the production Next server for `webDir`, returning its
 * request handler.
 *
 * `next` is resolved from the web workspace rather than imported here: it is a
 * dependency of `@repo/web`, and pnpm's isolated node_linker means the API
 * package cannot see it. Only call this when {@link hasNextBuild} is true.
 */
export async function createNextRequestHandler(
  webDir: string,
): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  const requireFromWeb = createRequire(join(webDir, 'package.json'));
  const imported = requireFromWeb('next') as NextFactory | { default: NextFactory };
  const createNext: NextFactory = typeof imported === 'function' ? imported : imported.default;

  const nextServer = createNext({ dev: false, dir: webDir });
  await nextServer.prepare();
  const handle = nextServer.getRequestHandler();

  return (req, res) => {
    void handle(req, res);
  };
}
