/**
 * Browser-side API client.
 *
 * The NestJS server mounts every route under the `/api` prefix (see
 * `apps/api/src/main.ts`). `NEXT_PUBLIC_API_URL` points at the server origin;
 * we append `/api` here so callers pass clean paths like `/auth/login`.
 *
 * User-facing error copy comes from the server (`apps/api/src/common/messages.ts`),
 * so an {@link ApiError} carries that message in {@link ApiError.serverMessage}
 * — and carries `null` when the failure was synthesized here (network drop,
 * unreadable body). This module holds no user-facing sentences of its own: it
 * cannot know the reader's locale, so naming the fallback is the render site's
 * job via {@link apiErrorMessage}.
 */

import type { WebTranslate, WebTranslationKey } from './web-translations';

/**
 * Server origin for the NestJS API. Exported so callers that build an *absolute*
 * asset URL — e.g. the branding logo/favicon served by `GET /branding/asset/*`,
 * whose paths already carry the `/api` prefix — can prefix the origin without
 * double-appending `/api` (which {@link apiUrl} would do).
 */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_BASE = `${API_ORIGIN}/api`;

/** Catalog key for the neutral "we have nothing more specific to say" line. */
export const GENERIC_ERROR_KEY: WebTranslationKey = 'common.genericError';

/**
 * Absolute URL for an API path. Use when fetching outside `apiFetch` — e.g. a
 * binary stream (PDF bytes) that isn't JSON — so the `/api` prefix stays in one
 * place.
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  readonly status: number;

  /**
   * The server's user-facing sentence, or `null` when the client synthesized
   * this failure and no server copy exists.
   *
   * Kept separate from `message` on purpose: `message` must stay populated for
   * stack traces and logs, but rendering it unconditionally is how a
   * developer-facing string reaches a user. Render sites read this field (via
   * {@link apiErrorMessage}) and localize the `null` case themselves.
   */
  readonly serverMessage: string | null;

  constructor(serverMessage: string | null, status: number) {
    super(serverMessage ?? `Request failed (${status || 'network'})`);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

/** Pull a single human message out of a Nest error body (string | string[]). */
function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0 && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serializable request body. */
  json?: unknown;
  /** Bearer token for authenticated calls. */
  token?: string;
}

/**
 * Fetch a binary response (e.g. a PDF download) as a Blob, surfacing the
 * server's Toss-tone error copy on failure just like {@link apiFetch}. The
 * server sends the filename via `Content-Disposition`; callers that already know
 * a good name (e.g. from the contract title) can ignore the returned one.
 */
export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const { token, headers, ...rest } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(null, 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(extractMessage(body), res.status);
  }

  const blob = await res.blob();
  return { blob, filename: filenameFromDisposition(res.headers.get('Content-Disposition')) };
}

/** Pull the UTF-8 `filename*` (or plain `filename`) out of a disposition header. */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      // Malformed encoding — fall through to the plain filename.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json, token, headers, ...rest } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    // Network / CORS / server-down — never expose the raw error.
    throw new ApiError(null, 0);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(extractMessage(body), res.status);
  }

  return body as T;
}

/**
 * The sentence to show a user for a failed request.
 *
 * Prefers the server's own copy — it is authored per locale server-side and is
 * always more specific than anything the browser could say — and otherwise
 * resolves `fallbackKey` from the browser catalog. Callers pass a
 * domain-specific fallback ("We could not load your contracts.") where one
 * exists; the default is the product-wide neutral line.
 *
 * Taking the translator as an argument keeps this usable outside React and
 * keeps the choice of locale where the locale is actually known.
 */
export function apiErrorMessage(
  t: WebTranslate,
  error: unknown,
  fallbackKey: WebTranslationKey = GENERIC_ERROR_KEY,
): string {
  const serverMessage = error instanceof ApiError ? error.serverMessage : null;
  return serverMessage?.trim() ? serverMessage : t(fallbackKey);
}
