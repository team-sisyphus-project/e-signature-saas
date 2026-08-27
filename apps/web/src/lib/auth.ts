/**
 * Client-side session for the sender web app.
 *
 * The API returns the access token in the login response body (not a Set-Cookie),
 * so the browser owns it. We persist to `localStorage` as the source of truth and
 * mirror a non-HttpOnly cookie so a future server component / middleware (grain-5
 * dashboard) can read auth state during SSR. This module is the single place that
 * knows how the session is stored.
 */

import { apiFetch } from './api';
import { DEFAULT_LOCALE, parseLocale } from './locale';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  locale: 'ko' | 'en';
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

const TOKEN_KEY = 'esign.token';
const USER_KEY = 'esign.user';
const COOKIE_NAME = 'esign_token';
/** Mirror cookie lifetime (7d) — auth lifetime is enforced server-side by the JWT. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function writeCookie(token: string): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function clearCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function notifySessionChange(): void {
  window.dispatchEvent(new Event('esign:session-change'));
}

/** Persist the session after a successful login. */
export function setSession(session: LoginResponse): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  writeCookie(session.accessToken);
  notifySessionChange();
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearCookie();
  notifySessionChange();
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** Update the persisted sender preference and notify locale consumers immediately. */
export async function updateLocale(locale: SessionUser['locale']): Promise<SessionUser> {
  const user = await apiFetch<SessionUser>('/auth/locale', {
    method: 'POST',
    json: { locale },
    token: getToken() ?? undefined,
  });
  if (isBrowser()) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifySessionChange();
  }
  return user;
}

/** Authenticate and establish the session. Throws `ApiError` on failure. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const session = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  setSession(session);
  return session;
}

/**
 * Create an account and establish the session. The server returns the same
 * `{ accessToken, user }` shape as login, so registration logs the user in
 * immediately (no separate sign-in step). Throws `ApiError` on failure — e.g.
 * the email is already taken. */
export async function register(email: string, password: string): Promise<LoginResponse> {
  const session = await apiFetch<LoginResponse>('/auth/register', {
    method: 'POST',
    json: { email, password },
  });
  setSession(session);
  return session;
}

/**
 * Exchange a Google authorization `code` (from the GIS auth-code popup) for a
 * session. The server upserts the social account and returns the same
 * `{ accessToken, user }` shape as email login, so a successful Google sign-in
 * establishes the session identically — first-time users are created on the fly
 * (sign-up) and returning users are signed in. Throws `ApiError` on failure. */
export async function loginWithGoogle(code: string): Promise<LoginResponse> {
  const session = await apiFetch<LoginResponse>('/auth/google', {
    method: 'POST',
    json: { code },
  });
  setSession(session);
  return session;
}

/** In-flight `/auth/me` read, so a double-mounted app makes one request. */
let inFlightRestore: Promise<SessionUser | null> | null = null;

/**
 * Adopt the account's stored session when the browser holds a token but no
 * cached user — the state left behind by a cleared or evicted `localStorage`
 * (private-window reopen, "clear site data", storage pressure) between visits.
 *
 * Without this, such a session renders as "signed in, preference unknown", and
 * every locale tier falls through to the Korean default: a sender who saved
 * English would silently get Korean back. The token is the proof of identity, so
 * the account row — not the absent cache — is the authority on the preference.
 *
 * Non-destructive by design: a failed read (offline, rejected token) leaves the
 * stored session exactly as it was. Deciding that a token is dead belongs to
 * token refresh, which this grain does not own, and clearing here would sign a
 * user out on a transient network blip.
 *
 * Concurrent callers share one request, and a result is discarded if the token
 * changed while it was in flight (a login landing mid-fetch owns the session).
 */
export function restoreSession(): Promise<SessionUser | null> {
  if (!isBrowser()) return Promise.resolve(null);
  const token = getToken();
  if (!token) return Promise.resolve(null);

  const cached = getUser();
  if (cached) return Promise.resolve(cached);

  inFlightRestore ??= fetchSessionUser(token).finally(() => {
    inFlightRestore = null;
  });
  return inFlightRestore;
}

async function fetchSessionUser(token: string): Promise<SessionUser | null> {
  let body: unknown;
  try {
    body = await apiFetch<unknown>('/auth/me', { token });
  } catch {
    return null;
  }

  const user = toSessionUser(body);
  // A session established while this was in flight is newer than this answer.
  if (!user || getToken() !== token) return null;

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySessionChange();
  return user;
}

/**
 * Narrow an untrusted `/auth/me` body to exactly the session fields.
 *
 * The endpoint also projects branding columns, which the login response does
 * not: storing the body verbatim would make the cached session's shape depend
 * on which call happened to write it. An unsupported `locale` degrades to the
 * default rather than voiding the session — identity is still known, only the
 * preference is unreadable.
 */
function toSessionUser(body: unknown): SessionUser | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.email !== 'string') return null;

  return {
    id: raw.id,
    email: raw.email,
    name: typeof raw.name === 'string' ? raw.name : null,
    plan: typeof raw.plan === 'string' ? raw.plan : '',
    locale: parseLocale(typeof raw.locale === 'string' ? raw.locale : null) ?? DEFAULT_LOCALE,
  };
}
