import {
  applyResolvedTheme,
  parseThemePreference,
  prefersDarkScheme,
  readThemeCookie,
  resolveTheme,
  writeThemeCookie,
  clearThemeCookie,
  THEME_COOKIE_MAX_AGE,
  THEME_NO_FLASH_SCRIPT,
} from './theme';

describe('parseThemePreference', () => {
  it.each(['light', 'dark', 'system'] as const)('keeps the known preference %s', (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each([undefined, null, '', 'DARK', 'blue', 'lightish'])(
    'falls back to system for the invalid input %p',
    (value) => {
      expect(parseThemePreference(value)).toBe('system');
    },
  );
});

describe('resolveTheme', () => {
  it('always returns the fixed preference regardless of the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('follows the OS when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

type ThemeTestGlobals = {
  window?: { matchMedia?: (query: string) => { matches: boolean }; location: { protocol: string } };
  document?: {
    cookie: string;
    documentElement: {
      attrs: Record<string, string>;
      setAttribute: (name: string, value: string) => void;
      removeAttribute: (name: string) => void;
    };
  };
};
const globals = globalThis as unknown as ThemeTestGlobals;

function makeDocumentElement() {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    removeAttribute: (name: string) => {
      delete attrs[name];
    },
  };
}

afterEach(() => {
  delete globals.window;
  delete globals.document;
});

describe('prefersDarkScheme', () => {
  it('is false when there is no window', () => {
    expect(prefersDarkScheme()).toBe(false);
  });

  it('reflects the matchMedia result', () => {
    globals.window = { matchMedia: () => ({ matches: true }), location: { protocol: 'https:' } };
    expect(prefersDarkScheme()).toBe(true);
    globals.window.matchMedia = () => ({ matches: false });
    expect(prefersDarkScheme()).toBe(false);
  });

  it('is false when matchMedia is unavailable', () => {
    globals.window = { location: { protocol: 'http:' } };
    expect(prefersDarkScheme()).toBe(false);
  });
});

describe('applyResolvedTheme', () => {
  it('sets data-theme=dark for dark and removes it for light', () => {
    const documentElement = makeDocumentElement();
    globals.document = { cookie: '', documentElement };

    applyResolvedTheme('dark');
    expect(documentElement.attrs['data-theme']).toBe('dark');

    applyResolvedTheme('light');
    expect(documentElement.attrs['data-theme']).toBeUndefined();
  });
});

describe('esign_theme cookie mirror', () => {
  beforeEach(() => {
    globals.window = { location: { protocol: 'https:' } };
    globals.document = { cookie: '', documentElement: makeDocumentElement() };
  });

  it('writes the preference with a 1-year max-age and Secure on https', () => {
    writeThemeCookie('dark');
    expect(globals.document!.cookie).toContain('esign_theme=dark');
    expect(globals.document!.cookie).toContain(`Max-Age=${THEME_COOKIE_MAX_AGE}`);
    expect(globals.document!.cookie).toContain('SameSite=Lax');
    expect(globals.document!.cookie).toContain('; Secure');
  });

  it('omits Secure on http', () => {
    globals.window!.location.protocol = 'http:';
    writeThemeCookie('light');
    expect(globals.document!.cookie).not.toContain('Secure');
  });

  it('reads back a written preference', () => {
    globals.document!.cookie = 'other=1; esign_theme=dark; another=2';
    expect(readThemeCookie()).toBe('dark');
  });

  it('falls back to system for an absent or tampered cookie', () => {
    globals.document!.cookie = 'esign_theme=evil';
    expect(readThemeCookie()).toBe('system');
    globals.document!.cookie = 'unrelated=1';
    expect(readThemeCookie()).toBe('system');
  });

  it('clears the cookie with an expired max-age', () => {
    clearThemeCookie();
    expect(globals.document!.cookie).toContain('esign_theme=;');
    expect(globals.document!.cookie).toContain('Max-Age=0');
  });
});

describe('THEME_NO_FLASH_SCRIPT', () => {
  it('is a static string that interpolates no dynamic value', () => {
    expect(typeof THEME_NO_FLASH_SCRIPT).toBe('string');
    // No template placeholders leaked into the payload (must be a constant literal).
    expect(THEME_NO_FLASH_SCRIPT).not.toContain('${');
    expect(THEME_NO_FLASH_SCRIPT).toContain('esign_theme');
    expect(THEME_NO_FLASH_SCRIPT).toContain('prefers-color-scheme: dark');
  });

  it('resolves the theme the same way as resolveTheme when executed', () => {
    function runScript(cookie: string, prefersDark: boolean): string | undefined {
      const attrs: Record<string, string> = {};
      const doc = {
        cookie,
        documentElement: {
          setAttribute: (n: string, v: string) => {
            attrs[n] = v;
          },
          removeAttribute: (n: string) => {
            delete attrs[n];
          },
        },
      };
      const win = { matchMedia: (_q: string) => ({ matches: prefersDark }) };
      // eslint-disable-next-line no-new-func
      new Function('document', 'window', THEME_NO_FLASH_SCRIPT)(doc, win);
      return attrs['data-theme'];
    }

    expect(runScript('esign_theme=dark', false)).toBe('dark');
    expect(runScript('esign_theme=light', true)).toBeUndefined();
    expect(runScript('esign_theme=system', true)).toBe('dark');
    expect(runScript('esign_theme=system', false)).toBeUndefined();
    expect(runScript('', true)).toBe('dark'); // absent → system → follows OS
  });
});
