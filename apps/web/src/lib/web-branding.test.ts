/**
 * Branding asset/URL resolution across the same-origin default.
 *
 * Browser-side asset URLs may stay root-relative (the browser resolves them
 * against the page), but SSR runs in Node where `fetch` has no base to resolve
 * against — so the server path must always produce an absolute URL.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- `API_ORIGIN` is
   resolved once at module load, so re-reading it under a different environment
   requires a real re-`require` inside `jest.isolateModules`; a static `import`
   is hoisted and evaluated before the env stub is in place. */

type BrandingModule = typeof import('./web-branding');

/** Load a fresh copy of `lib/web-branding` with `NEXT_PUBLIC_API_URL` set as given. */
function loadBranding(value: string | undefined): BrandingModule {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = value;

  let mod!: BrandingModule;
  try {
    jest.isolateModules(() => {
      mod = require('./web-branding') as BrandingModule;
    });
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  }
  return mod;
}

describe('resolveAssetUrl', () => {
  it('keeps the API-relative path root-relative when the API is same-origin', () => {
    const { resolveAssetUrl } = loadBranding(undefined);
    expect(resolveAssetUrl('/api/branding/asset/logo?v=2')).toBe('/api/branding/asset/logo?v=2');
  });

  it('prefixes the configured origin without duplicating /api', () => {
    const { resolveAssetUrl } = loadBranding('https://api.example.com');
    expect(resolveAssetUrl('/api/branding/asset/logo?v=2')).toBe(
      'https://api.example.com/api/branding/asset/logo?v=2',
    );
  });

  it('passes through null and already-absolute URLs', () => {
    const { resolveAssetUrl } = loadBranding(undefined);
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl('https://cdn.example.com/logo.svg')).toBe(
      'https://cdn.example.com/logo.svg',
    );
  });
});

describe('serverApiOrigin', () => {
  it('falls back to loopback on PORT when the API is same-origin', () => {
    const { serverApiOrigin } = loadBranding(undefined);
    expect(serverApiOrigin({ PORT: '8080' })).toBe('http://127.0.0.1:8080');
  });

  it('prefers PORT over API_PORT, matching the server bootstrap', () => {
    const { serverApiOrigin } = loadBranding(undefined);
    expect(serverApiOrigin({ PORT: '8080', API_PORT: '3001' })).toBe('http://127.0.0.1:8080');
  });

  it('uses API_PORT when PORT is unset or blank', () => {
    const { serverApiOrigin } = loadBranding(undefined);
    expect(serverApiOrigin({ API_PORT: '4000' })).toBe('http://127.0.0.1:4000');
    expect(serverApiOrigin({ PORT: '  ', API_PORT: '4000' })).toBe('http://127.0.0.1:4000');
  });

  it('defaults to port 3001 when neither is set', () => {
    const { serverApiOrigin } = loadBranding(undefined);
    expect(serverApiOrigin({})).toBe('http://127.0.0.1:3001');
  });

  it('uses the configured origin verbatim for a split deployment', () => {
    const { serverApiOrigin } = loadBranding('https://api.example.com');
    expect(serverApiOrigin({ PORT: '8080' })).toBe('https://api.example.com');
  });
});

describe('fetchBrandingServer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches an absolute loopback URL when the API is same-origin', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        json: async () => ({ logoUrl: '/api/branding/asset/logo', faviconUrl: null }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const { fetchBrandingServer } = loadBranding(undefined);
    await expect(fetchBrandingServer()).resolves.toEqual({
      logoUrl: '/api/branding/asset/logo',
      faviconUrl: null,
      brandColor: null,
    });

    // Absolute — Node's `fetch` cannot resolve a root-relative URL.
    expect(calls).toEqual(['http://127.0.0.1:3001/api/branding']);
  });

  it('falls back to empty branding when the API is unreachable', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;

    const { fetchBrandingServer, EMPTY_BRANDING } = loadBranding(undefined);
    await expect(fetchBrandingServer()).resolves.toEqual(EMPTY_BRANDING);
  });
});
