/**
 * URL construction for the browser API client.
 *
 * The single-port deployment serves the web app *from* the API, so the client
 * must reach it at the same origin as the page. These tests pin that default —
 * `NEXT_PUBLIC_API_URL` unset ⇒ root-relative `/api/...` — and the escape hatch
 * for split deployments, where the variable supplies an absolute origin.
 *
 * `API_ORIGIN` is resolved once at module load, so each case re-imports the
 * module under a freshly stubbed environment (`jest.isolateModules`).
 */

/* eslint-disable @typescript-eslint/no-require-imports -- `API_ORIGIN` is
   resolved once at module load, so re-reading it under a different environment
   requires a real re-`require` inside `jest.isolateModules`; a static `import`
   is hoisted and evaluated before the env stub is in place. */

type ApiModule = typeof import('./api');

/** Load a fresh copy of `lib/api` with `NEXT_PUBLIC_API_URL` set as given. */
function loadApi(value: string | undefined): ApiModule {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = value;
  }

  let mod!: ApiModule;
  try {
    jest.isolateModules(() => {
      mod = require('./api') as ApiModule;
    });
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  }
  return mod;
}

describe('API_ORIGIN', () => {
  it('is empty when NEXT_PUBLIC_API_URL is unset, so requests stay same-origin', () => {
    expect(loadApi(undefined).API_ORIGIN).toBe('');
  });

  it('is empty when NEXT_PUBLIC_API_URL is set to an empty string', () => {
    expect(loadApi('').API_ORIGIN).toBe('');
  });

  it('uses the configured origin for a split deployment', () => {
    expect(loadApi('https://api.example.com').API_ORIGIN).toBe('https://api.example.com');
  });

  it('trims trailing slashes so concatenation never yields "//api"', () => {
    expect(loadApi('https://api.example.com/').API_ORIGIN).toBe('https://api.example.com');
    expect(loadApi('https://api.example.com///').API_ORIGIN).toBe('https://api.example.com');
  });
});

describe('apiUrl', () => {
  it('builds a root-relative /api path by default', () => {
    const { apiUrl } = loadApi(undefined);
    expect(apiUrl('/auth/login')).toBe('/api/auth/login');
    expect(apiUrl('/documents/1/pdf')).toBe('/api/documents/1/pdf');
  });

  it('keeps the /api prefix exactly once when an origin is configured', () => {
    const { apiUrl } = loadApi('https://api.example.com/');
    expect(apiUrl('/auth/login')).toBe('https://api.example.com/api/auth/login');
  });
});

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /** Stub `fetch` with a JSON response and capture the requested URL. */
  function stubFetch(): { calls: string[] } {
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    return { calls };
  }

  it('requests the same-origin /api path when no origin is configured', async () => {
    const { apiFetch } = loadApi(undefined);
    const { calls } = stubFetch();

    await expect(apiFetch<{ ok: boolean }>('/branding')).resolves.toEqual({ ok: true });
    expect(calls).toEqual(['/api/branding']);
  });

  it('requests the configured absolute origin when one is set', async () => {
    const { apiFetch } = loadApi('https://api.example.com');
    const { calls } = stubFetch();

    await apiFetch('/branding');
    expect(calls).toEqual(['https://api.example.com/api/branding']);
  });

  it('surfaces the generic message when the transport fails', async () => {
    const { apiFetch, ApiError, GENERIC_ERROR } = loadApi(undefined);
    global.fetch = jest.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;

    await expect(apiFetch('/branding')).rejects.toMatchObject({
      message: GENERIC_ERROR,
      status: 0,
    });
    await expect(apiFetch('/branding')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('apiDownload', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('requests the same-origin /api path when no origin is configured', async () => {
    const { apiDownload } = loadApi(undefined);
    const calls: string[] = [];
    const blob = { size: 3 } as Blob;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'attachment; filename="c.pdf"' },
        blob: async () => blob,
      } as unknown as Response;
    }) as unknown as typeof fetch;

    await expect(apiDownload('/documents/1/pdf')).resolves.toEqual({ blob, filename: 'c.pdf' });
    expect(calls).toEqual(['/api/documents/1/pdf']);
  });
});
