import { clearSession, getUser, setSession, updateLocale, updateTheme } from './auth';

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
        themePreference: 'system',
      }),
    });

    setSession({
      accessToken: 'before-update',
      user: {
        id: 'user_1',
        email: 'sender@example.com',
        name: 'Sender',
        plan: 'FREE',
        locale: 'ko',
        themePreference: 'system',
      },
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

describe('theme session persistence', () => {
  it('posts to /auth/theme, updates the stored user, mirrors the cookie and notifies consumers', async () => {
    const storage = makeMemoryStorage();
    const windowTarget = new EventTarget() as EventTarget & {
      localStorage: Storage;
      location: { protocol: string };
    };
    windowTarget.localStorage = storage;
    windowTarget.location = { protocol: 'https:' };
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
        locale: 'ko',
        themePreference: 'dark',
      }),
    });

    setSession({
      accessToken: 'session-token',
      user: {
        id: 'user_1',
        email: 'sender@example.com',
        name: 'Sender',
        plan: 'FREE',
        locale: 'ko',
        themePreference: 'system',
      },
    });
    const onSessionChange = jest.fn();
    windowTarget.addEventListener('esign:session-change', onSessionChange);

    await expect(updateTheme('dark')).resolves.toMatchObject({ id: 'user_1', themePreference: 'dark' });

    expect(globals.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/theme',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ theme: 'dark' }),
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    );
    expect(getUser()).toMatchObject({ id: 'user_1', themePreference: 'dark' });
    expect(globals.document!.cookie).toContain('esign_theme=dark');
    expect(onSessionChange).toHaveBeenCalledTimes(1);
  });

  it('mirrors the theme cookie when the session is established and clears it on logout', () => {
    const storage = makeMemoryStorage();
    const windowTarget = new EventTarget() as EventTarget & {
      localStorage: Storage;
      location: { protocol: string };
    };
    windowTarget.localStorage = storage;
    windowTarget.location = { protocol: 'https:' };
    globals.window = windowTarget;
    globals.localStorage = storage;
    globals.document = { cookie: '' };

    setSession({
      accessToken: 'session-token',
      user: {
        id: 'user_1',
        email: 'sender@example.com',
        name: 'Sender',
        plan: 'FREE',
        locale: 'ko',
        themePreference: 'light',
      },
    });
    expect(globals.document!.cookie).toContain('esign_theme=light');

    clearSession();
    expect(globals.document!.cookie).toContain('esign_theme=;');
    expect(globals.document!.cookie).toContain('Max-Age=0');
  });
});
