/**
 * Upload endpoint URL resolution.
 *
 * `uploadPdf` uses `XMLHttpRequest` (fetch can't report progress), so it can't
 * share `apiFetch` — but it must share the *same* base as every other call, and
 * that base is same-origin by default. These tests stub `XMLHttpRequest` and
 * assert the opened URL, which is the only thing this grain changes here.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- `API_ORIGIN` is
   resolved once at module load, so re-reading it under a different environment
   requires a real re-`require` inside `jest.isolateModules`; a static `import`
   is hoisted and evaluated before the env stub is in place. */

type UploadModule = typeof import('./upload');

interface OpenedRequest {
  method: string;
  url: string;
}

/** Minimal `XMLHttpRequest` stand-in that records `open` and replays a response. */
function installXhrStub(response: { status: number; body: string }): OpenedRequest[] {
  const opened: OpenedRequest[] = [];

  class FakeXhr {
    status = 0;
    responseText = '';
    upload: { onprogress: ((event: unknown) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;

    open(method: string, url: string): void {
      opened.push({ method, url });
    }

    setRequestHeader(): void {
      // Headers aren't under test here.
    }

    send(): void {
      this.status = response.status;
      this.responseText = response.body;
      this.onload?.();
    }

    abort(): void {
      this.onabort?.();
    }
  }

  (global as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr;
  return opened;
}

/** Load a fresh copy of `lib/upload` with `NEXT_PUBLIC_API_URL` set as given. */
function loadUpload(value: string | undefined): UploadModule {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = value;

  let mod!: UploadModule;
  try {
    jest.isolateModules(() => {
      mod = require('./upload') as UploadModule;
    });
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  }
  return mod;
}

/** A `File` stand-in — the stubbed XHR never reads it. */
const FILE = { name: 'contract.pdf' } as unknown as File;

describe('uploadPdf', () => {
  const originalXhr = (global as { XMLHttpRequest?: unknown }).XMLHttpRequest;
  const originalFormData = (global as { FormData?: unknown }).FormData;

  beforeAll(() => {
    (global as { FormData?: unknown }).FormData = class {
      append(): void {
        // Body contents aren't under test here.
      }
    };
  });

  afterAll(() => {
    (global as { FormData?: unknown }).FormData = originalFormData;
  });

  afterEach(() => {
    (global as { XMLHttpRequest?: unknown }).XMLHttpRequest = originalXhr;
  });

  it('posts to the same-origin /api path when no origin is configured', async () => {
    const opened = installXhrStub({ status: 201, body: '{"id":"doc_1"}' });
    const { uploadPdf } = loadUpload(undefined);

    await expect(uploadPdf(FILE)).resolves.toMatchObject({ id: 'doc_1' });
    expect(opened).toEqual([{ method: 'POST', url: '/api/documents/upload' }]);
  });

  it('posts to the configured absolute origin when one is set', async () => {
    const opened = installXhrStub({ status: 201, body: '{"id":"doc_1"}' });
    const { uploadPdf } = loadUpload('https://api.example.com');

    await uploadPdf(FILE);
    expect(opened).toEqual([
      { method: 'POST', url: 'https://api.example.com/api/documents/upload' },
    ]);
  });

  it("surfaces the server's message on a rejected upload", async () => {
    installXhrStub({ status: 400, body: '{"message":"파일이 너무 큽니다."}' });
    const { uploadPdf } = loadUpload(undefined);

    await expect(uploadPdf(FILE)).rejects.toMatchObject({
      message: '파일이 너무 큽니다.',
      status: 400,
    });
  });
});
