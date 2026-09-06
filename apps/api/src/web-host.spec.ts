import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  createWebFallbackMiddleware,
  DEFAULT_PORT,
  findWebAppDir,
  hasNextBuild,
  isApiRequestPath,
  resolveServerPort,
} from './web-host';

describe('resolveServerPort', () => {
  it('prefers PORT — the port the hosting platform injects', () => {
    expect(resolveServerPort({ PORT: '8080', API_PORT: '3001' })).toBe(8080);
  });

  it('falls back to API_PORT when PORT is absent', () => {
    expect(resolveServerPort({ API_PORT: '4000' })).toBe(4000);
  });

  it('falls back to the default when neither is set', () => {
    expect(resolveServerPort({})).toBe(DEFAULT_PORT);
  });

  it('treats a blank value as unset so an empty PORT does not shadow API_PORT', () => {
    expect(resolveServerPort({ PORT: '   ', API_PORT: '4000' })).toBe(4000);
    expect(resolveServerPort({ PORT: '', API_PORT: '' })).toBe(DEFAULT_PORT);
  });

  it('accepts port 0 — the OS-assigned ephemeral port', () => {
    expect(resolveServerPort({ PORT: '0' })).toBe(0);
  });

  it('fails loudly on an unusable port value, naming the variable', () => {
    expect(() => resolveServerPort({ PORT: 'http://x' })).toThrow(/PORT/);
    expect(() => resolveServerPort({ API_PORT: '70000' })).toThrow(/API_PORT/);
    expect(() => resolveServerPort({ PORT: '80.5' })).toThrow(/PORT/);
    expect(() => resolveServerPort({ PORT: '-1' })).toThrow(/PORT/);
  });
});

describe('findWebAppDir', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'web-host-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const makeWorkspace = (): string => {
    const webDir = join(root, 'apps', 'web');
    mkdirSync(webDir, { recursive: true });
    writeFileSync(join(webDir, 'package.json'), '{"name":"@repo/web"}');
    return webDir;
  };

  it('walks up from the compiled API directory to the web workspace', () => {
    const webDir = makeWorkspace();
    const apiDist = join(root, 'apps', 'api', 'dist');
    mkdirSync(apiDist, { recursive: true });

    expect(findWebAppDir(apiDist)).toBe(webDir);
  });

  it('finds the web workspace from the repo root itself', () => {
    const webDir = makeWorkspace();

    expect(findWebAppDir(root)).toBe(webDir);
  });

  it('returns null when there is no web workspace above the start directory', () => {
    const lonely = join(root, 'apps', 'api', 'dist');
    mkdirSync(lonely, { recursive: true });

    expect(findWebAppDir(lonely)).toBeNull();
  });
});

describe('hasNextBuild', () => {
  let webDir: string;

  beforeEach(() => {
    webDir = mkdtempSync(join(tmpdir(), 'web-build-'));
  });

  afterEach(() => {
    rmSync(webDir, { recursive: true, force: true });
  });

  it('is false when the app was never built', () => {
    expect(hasNextBuild(webDir)).toBe(false);
  });

  it('is false when .next exists but holds no build manifest', () => {
    mkdirSync(join(webDir, '.next', 'cache'), { recursive: true });

    expect(hasNextBuild(webDir)).toBe(false);
  });

  it('is true once the build emitted a BUILD_ID', () => {
    mkdirSync(join(webDir, '.next'), { recursive: true });
    writeFileSync(join(webDir, '.next', 'BUILD_ID'), 'abc123');

    expect(hasNextBuild(webDir)).toBe(true);
  });

  it('is false for a null web directory (API-only mode)', () => {
    expect(hasNextBuild(null)).toBe(false);
  });
});

describe('isApiRequestPath', () => {
  it.each([
    '/api',
    '/api/',
    '/api/documents/42',
    '/health',
    '/health/',
    // Express routing is case-insensitive, so these reach the API too.
    '/API/documents',
    '/Health',
  ])('claims %s for the API', (pathname) => {
    expect(isApiRequestPath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/login',
    '/sign/abc123',
    '/_next/static/chunks/main.js',
    '/favicon.ico',
    // Only whole first segments belong to the API.
    '/apidocs',
    '/healthcheck',
    '/docs/api',
  ])('leaves %s to the web app', (pathname) => {
    expect(isApiRequestPath(pathname)).toBe(false);
  });
});

describe('createWebFallbackMiddleware', () => {
  const run = (req: Partial<IncomingMessage> & { path?: string }) => {
    const handleWebRequest = jest.fn();
    const next = jest.fn();
    const res = {} as ServerResponse;

    createWebFallbackMiddleware(handleWebRequest)(
      req as IncomingMessage & { path?: string },
      res,
      next,
    );

    return { handleWebRequest, next, res };
  };

  it('passes API requests through to Nest untouched', () => {
    const { handleWebRequest, next } = run({ path: '/api/documents' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(handleWebRequest).not.toHaveBeenCalled();
  });

  it('passes /health through to Nest', () => {
    const { handleWebRequest, next } = run({ path: '/health' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(handleWebRequest).not.toHaveBeenCalled();
  });

  it('hands every other request to the web app', () => {
    const req = { path: '/login' };
    const { handleWebRequest, next, res } = run(req);

    expect(next).not.toHaveBeenCalled();
    expect(handleWebRequest).toHaveBeenCalledWith(req, res);
  });

  it('derives the path from the url when Express did not set req.path', () => {
    const withoutPath = run({ url: '/dashboard?tab=sent' });
    expect(withoutPath.handleWebRequest).toHaveBeenCalledTimes(1);
    expect(withoutPath.next).not.toHaveBeenCalled();

    const apiWithoutPath = run({ url: '/api/documents?page=2' });
    expect(apiWithoutPath.handleWebRequest).not.toHaveBeenCalled();
    expect(apiWithoutPath.next).toHaveBeenCalledTimes(1);
  });
});
