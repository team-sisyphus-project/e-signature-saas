'use client';

/**
 * Share recipient flow state machine + shared context.
 *
 * One share link drives a small client state machine:
 *
 *   loading ──▶ gate ──▶ viewing ──▶ done
 *      │          │
 *      │          └─(open link: auto-unlock, no gate)
 *      └─▶ blocked (expired | disabled | invalidLink | notSignable | alreadySubmitted)
 *
 * It mirrors the OTP signer machine (`signer-context`) but swaps the access gate
 * (a single password instead of a 6-digit code) and the endpoints (`/share/*`
 * instead of `/signing/*`). The reading / capture / completion experience is
 * identical, so this provider projects its state onto the flow-neutral
 * {@link FillContextValue} and wraps its children in a {@link FillProvider} — the
 * shared `document-viewer` / `signature-sheet` / `completion-screen` render the
 * recipient flow without any signer coupling. The OTP `/sign/[token]` flow is
 * left entirely untouched.
 */

import * as React from 'react';
import { ApiError } from '@/lib/api';
import { useLocale, useTranslation } from '@/components/locale-provider';
import { getLinkLocale } from '@/lib/locale';
import { SHARE_FILL_COPY } from '@/lib/fill-copy';
import {
  fetchShareMeta,
  fetchSharePayload,
  getShareSession,
  saveShareFields,
  setShareSession,
  sharePdfUrl,
  submitShare,
  unlockShare,
  metaBlockReason,
  unlockBlockReason,
  type ShareBlockReason,
  type ShareMeta,
  type SharePayload,
} from '@/lib/share-recipient';

export type { ShareBlockReason };
import {
  FillProvider,
  type FillContextValue,
  type FillFieldValue,
} from '@/components/signer/fill-context';

export type SharePhase = 'loading' | 'gate' | 'viewing' | 'done' | 'blocked';

export interface ShareState {
  phase: SharePhase;
  meta: ShareMeta | null;
  payload: SharePayload | null;
  blockReason: ShareBlockReason | null;
  fieldValues: Record<string, FillFieldValue>;
  activeFieldId: string | null;
  documentCompleted: boolean;
}

const initialState: ShareState = {
  phase: 'loading',
  meta: null,
  payload: null,
  blockReason: null,
  fieldValues: {},
  activeFieldId: null,
  documentCompleted: false,
};

type ShareAction =
  | { type: 'META'; meta: ShareMeta }
  | { type: 'BLOCK'; reason: ShareBlockReason }
  | { type: 'UNLOCKED'; payload: SharePayload }
  | { type: 'DONE'; documentCompleted: boolean }
  | { type: 'OPEN_FIELD'; fieldId: string }
  | { type: 'CLOSE_FIELD' }
  | { type: 'SET_FIELD_VALUE'; fieldId: string; value: FillFieldValue };

function reducer(state: ShareState, action: ShareAction): ShareState {
  switch (action.type) {
    case 'META':
      if (action.meta.alreadySubmitted) {
        return { ...state, meta: action.meta, phase: 'blocked', blockReason: 'alreadySubmitted' };
      }
      // A password-protected link shows the gate; an open link stays on the
      // loading skeleton while it auto-unlocks.
      return {
        ...state,
        meta: action.meta,
        phase: action.meta.requiresPassword ? 'gate' : 'loading',
      };
    case 'BLOCK':
      return { ...state, phase: 'blocked', blockReason: action.reason };
    case 'UNLOCKED':
      return { ...state, phase: 'viewing', payload: action.payload };
    case 'DONE':
      return { ...state, phase: 'done', documentCompleted: action.documentCompleted };
    case 'OPEN_FIELD':
      return { ...state, activeFieldId: action.fieldId };
    case 'CLOSE_FIELD':
      return { ...state, activeFieldId: null };
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        fieldValues: { ...state.fieldValues, [action.fieldId]: action.value },
        activeFieldId: state.activeFieldId === action.fieldId ? null : state.activeFieldId,
      };
    default:
      return state;
  }
}

interface ShareContextValue {
  state: ShareState;
  /** The LINK access token for this share link. */
  token: string;
  /**
   * Open the link: verify the password (when set), issue a share session, then
   * load the recipient's payload and advance to the viewer. A wrong/locked
   * password rejects with the server's Toss-tone message so the gate can shake +
   * surface it inline; an expired/invalid link transitions straight to its notice.
   */
  unlock: (password?: string) => Promise<void>;
}

const ShareContext = React.createContext<ShareContextValue | null>(null);

export function ShareProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const { setSenderLocale, setPublicLinkActive } = useLocale();
  const t = useTranslation();

  const unlock = React.useCallback(
    async (password?: string) => {
      try {
        const { sessionToken } = await unlockShare(token, password);
        setShareSession(token, sessionToken);
        const payload = await fetchSharePayload(token, sessionToken);
        dispatch({ type: 'UNLOCKED', payload });
      } catch (error) {
        // Unambiguously terminal states resolve to their notice regardless of
        // where unlock was called from; retryable states (wrong/locked password)
        // propagate so the gate can surface them inline.
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 410) {
          dispatch({ type: 'BLOCK', reason: 'expired' });
          return;
        }
        if (status === 404) {
          dispatch({ type: 'BLOCK', reason: 'invalidLink' });
          return;
        }
        throw error;
      }
    },
    [token],
  );

  // Load pre-auth metadata once per link, then route to gate / auto-unlock / notice.
  React.useEffect(() => {
    let active = true;
    setPublicLinkActive(true);
    fetchShareMeta(token, getLinkLocale())
      .then((meta) => {
        if (!active) return;
        // The sender tier takes the sender's own stored preference, not
        // `meta.locale` — the server has already folded the link parameter,
        // Accept-Language and the Korean default into that one, so it can never
        // be absent and would silently outrank this visitor's browser.
        setSenderLocale(meta.sender.locale);
        dispatch({ type: 'META', meta });
        // An open link (no password) unlocks immediately behind the skeleton.
        if (!meta.alreadySubmitted && !meta.requiresPassword) {
          unlock().catch((error) => {
            if (active) dispatch({ type: 'BLOCK', reason: unlockBlockReason(error) });
          });
        }
      })
      .catch((error) => {
        if (active) {
          setSenderLocale(null);
          dispatch({ type: 'BLOCK', reason: metaBlockReason(error) });
        }
      });
    return () => {
      active = false;
      setSenderLocale(null);
      setPublicLinkActive(false);
    };
  }, [token, unlock, setSenderLocale, setPublicLinkActive]);

  const openField = React.useCallback(
    (fieldId: string) => dispatch({ type: 'OPEN_FIELD', fieldId }),
    [],
  );
  const closeField = React.useCallback(() => dispatch({ type: 'CLOSE_FIELD' }), []);
  const setFieldValue = React.useCallback(
    (fieldId: string, value: FillFieldValue) =>
      dispatch({ type: 'SET_FIELD_VALUE', fieldId, value }),
    [],
  );

  const persistFields = React.useCallback(
    async (fields: { fieldId: string; value: string }[]) => {
      const session = getShareSession(token);
      if (!session) return;
      await saveShareFields(token, session, fields);
    },
    [token],
  );

  const complete = React.useCallback(async () => {
    const session = getShareSession(token);
    if (!session) {
      // A missing session means the unlock token expired or the tab lost it.
      throw new ApiError(t('share.viewerCompleteError'), 401);
    }
    const result = await submitShare(token, session);
    dispatch({ type: 'DONE', documentCompleted: result.documentCompleted });
  }, [token, t]);

  const value = React.useMemo<ShareContextValue>(
    () => ({ state, token, unlock }),
    [state, token, unlock],
  );

  // Project the recipient state machine onto the flow-neutral fill surface.
  const fillValue = React.useMemo<FillContextValue>(() => {
    const documentTitle = state.payload?.documentTitle ?? state.meta?.documentTitle ?? '';
    return {
      // No locale in the fallback: before metadata resolves, the sender's
      // language is unknown, and claiming Korean here would outrank the
      // visitor's browser in the tier below it.
      sender: state.meta?.sender ?? { name: null, brandColor: null, brandLogoUrl: null },
      brandColor: state.meta?.sender.brandColor ?? null,
      documentTitle,
      payload: state.payload
        ? {
            documentTitle: state.payload.documentTitle,
            pageCount: state.payload.pageCount,
            fields: state.payload.fields,
          }
        : null,
      fieldValues: state.fieldValues,
      activeFieldId: state.activeFieldId,
      documentCompleted: state.documentCompleted,
      pdfUrl: sharePdfUrl(token),
      loadSession: () => getShareSession(token),
      persistFields,
      openField,
      closeField,
      setFieldValue,
      complete,
      copy: SHARE_FILL_COPY,
      // No download: a fill link has no completed artifact to hand back.
    };
  }, [state, token, persistFields, openField, closeField, setFieldValue, complete]);

  return (
    <ShareContext.Provider value={value}>
      <FillProvider value={fillValue}>{children}</FillProvider>
    </ShareContext.Provider>
  );
}

export function useShare(): ShareContextValue {
  const ctx = React.useContext(ShareContext);
  if (!ctx) throw new Error('useShare must be used within a ShareProvider');
  return ctx;
}
