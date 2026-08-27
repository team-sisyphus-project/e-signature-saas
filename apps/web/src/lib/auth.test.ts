import { getUser, restoreSession, setSession, updateLocale } from './auth';

function makeMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  } as Storage;
}

type BrowserTestGlobals = {
  window?: EventTarget & { localStorage: Storage; location: { protocol: string } };
  document?: { cookie: string };
  localStorage?: Storage;
  fetch?: typeof fetch;
};
const globals = globalThis as unknown as BrowserTestGlobals;
const nativeFetch = globalThis.fetch;

afterEach(() => {
  delete globals.window;
  delete globals.document;
  delete globals.localStorage;
  if (nativeFetch) globals.fetch = nativeFetch;
  else delete globals.fetch;
});

describe('locale session persistence', () => {
  it('updates the stored session and notifies locale consumers as soon as /auth/locale succeeds', async () => {
    const storage = makeMemoryStorage();
    const windowTarget = new EventTarget() as EventTarget & {
      localStorage: Storage;
      location: { protocol: string };
    };
    windowTarget.localStorage = storage;
    windowTarget.location = { protocol: 'http:' };
    globals.window = windowTarget;
    globals.localStorage = storage;
    globals.document = { cookie: '' };
    globals.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user_1',
        email: 'sender@example.com',
        name: 'Sender',
        plan: 'FREE',
        locale: 'en',
      }),
    });

    setSession({
      accessToken: 'before-update',
      user: { id: 'user_1', email: 'sender@example.com', name: 'Sender', plan: 'FREE', locale: 'ko' },
    });
    const onSessionChange = jest.fn();
    windowTarget.addEventListener('esign:session-change', onSessionChange);

    await expect(updateLocale('en')).resolves.toMatchObject({ id: 'user_1', locale: 'en' });

    expect(globals.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/locale',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ locale: 'en' }),
        headers: expect.objectContaining({ Authorization: 'Bearer before-update' }),
      }),
    );
    expect(getUser()).toMatchObject({ id: 'user_1', locale: 'en' });
    expect(onSessionChange).toHaveBeenCalledTimes(1);
  });
});

describe('session restore from the account', () => {
  const ME_URL = 'http://localhost:3001/api/auth/me';
  const STORED = {
    id: 'user_1',
    email: 'sender@example.com',
    name: 'Sender',
    plan: 'PRO',
    locale: 'en',
    brandColor: '#0b5',
    brandLogoUrl: 'https://cdn.example.com/logo.png',
  };

  /** A browser holding `token`, with whatever `user` the storage survived with. */
  function givenBrowser(entries: Record<string, string> = {}): Storage {
    const storage = makeMemoryStorage();
    for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
    const windowTarget = new EventTarget() as EventTarget & {
      localStorage: Storage;
      location: { protocol: string };
    };
    windowTarget.localStorage = storage;
    windowTarget.location = { protocol: 'https:' };
    globals.window = windowTarget;
    globals.localStorage = storage;
    globals.document = { cookie: '' };
    return storage;
  }

  function respondWith(body: unknown, ok = true): jest.Mock {
    const mock = jest.fn().mockResolvedValue({ ok, json: async () => body });
    globals.fetch = mock;
    return mock;
  }

  it('reads the account when a token outlived the cached user, so the saved locale wins over the default', async () => {
    const storage = givenBrowser({ 'esign.token': 'kept-token' });
    const fetchMock = respondWith(STORED);

    await expect(restoreSession()).resolves.toMatchObject({ id: 'user_1', locale: 'en' });

    expect(fetchMock).toHaveBeenCalledWith(
      ME_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer kept-token' }),
      }),
    );
    // The next read of the session — by the locale provider or any page — sees it.
    expect(getUser()).toMatchObject({ locale: 'en' });
    expect(storage.getItem('esign.token')).toBe('kept-token');
  });

  it('announces the restored session so locale consumers re-resolve', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    respondWith(STORED);
    const onSessionChange = jest.fn();
    globals.window!.addEventListener('esign:session-change', onSessionChange);

    await restoreSession();

    expect(onSessionChange).toHaveBeenCalledTimes(1);
  });

  it('stores only the session fields, so a restored session has the same shape as a logged-in one', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    respondWith(STORED);

    await restoreSession();

    expect(Object.keys(JSON.parse(localStorage.getItem('esign.user')!)).sort()).toEqual([
      'email',
      'id',
      'locale',
      'name',
      'plan',
    ]);
  });

  it('keeps the cached user without a request when one is already there', async () => {
    givenBrowser({
      'esign.token': 'kept-token',
      'esign.user': JSON.stringify({ ...STORED, locale: 'ko', brandColor: undefined }),
    });
    const fetchMock = respondWith(STORED);

    await expect(restoreSession()).resolves.toMatchObject({ locale: 'ko' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the account endpoint when there is no token', async () => {
    givenBrowser({});
    const fetchMock = respondWith(STORED);

    await expect(restoreSession()).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves to null outside a browser instead of touching storage', async () => {
    globals.fetch = jest.fn();

    await expect(restoreSession()).resolves.toBeNull();

    expect(globals.fetch).not.toHaveBeenCalled();
  });

  it('leaves the session untouched when the account read fails', async () => {
    const storage = givenBrowser({ 'esign.token': 'kept-token' });
    globals.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const onSessionChange = jest.fn();
    globals.window!.addEventListener('esign:session-change', onSessionChange);

    await expect(restoreSession()).resolves.toBeNull();

    // A network blip must not sign anyone out: the token still opens the app.
    expect(storage.getItem('esign.token')).toBe('kept-token');
    expect(getUser()).toBeNull();
    expect(onSessionChange).not.toHaveBeenCalled();
  });

  it('leaves the session untouched when the token is rejected', async () => {
    const storage = givenBrowser({ 'esign.token': 'stale-token' });
    respondWith({ message: '로그인이 필요해요.' }, false);

    await expect(restoreSession()).resolves.toBeNull();

    expect(storage.getItem('esign.token')).toBe('stale-token');
    expect(getUser()).toBeNull();
  });

  it('rejects a body that identifies nobody rather than storing a partial session', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    respondWith({ locale: 'en' });

    await expect(restoreSession()).resolves.toBeNull();

    expect(getUser()).toBeNull();
  });

  it('keeps the account signed in with the default locale when the stored preference is unreadable', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    respondWith({ ...STORED, locale: 'fr' });

    await expect(restoreSession()).resolves.toMatchObject({ id: 'user_1', locale: 'ko' });
  });

  it('makes one request when the provider mounts twice', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    const fetchMock = respondWith(STORED);

    const [first, second] = await Promise.all([restoreSession(), restoreSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ locale: 'en' });
    expect(second).toBe(first);
  });

  it('retries after a failed restore instead of caching the failure', async () => {
    givenBrowser({ 'esign.token': 'kept-token' });
    globals.fetch = jest.fn().mockRejectedValueOnce(new Error('offline'));

    await expect(restoreSession()).resolves.toBeNull();

    const fetchMock = respondWith(STORED);
    await expect(restoreSession()).resolves.toMatchObject({ locale: 'en' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('discards the account read when a login replaced the session mid-flight', async () => {
    const storage = givenBrowser({ 'esign.token': 'kept-token' });
    globals.fetch = jest.fn().mockImplementation(async () => {
      // The user finished logging in as someone else while this was in flight.
      setSession({
        accessToken: 'newer-token',
        user: { id: 'user_2', email: 'other@example.com', name: null, plan: 'FREE', locale: 'ko' },
      });
      return { ok: true, json: async () => STORED };
    });

    await expect(restoreSession()).resolves.toBeNull();

    expect(storage.getItem('esign.token')).toBe('newer-token');
    expect(getUser()).toMatchObject({ id: 'user_2', locale: 'ko' });
  });
});
