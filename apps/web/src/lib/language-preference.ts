/**
 * Language-settings panel state — pure, DOM-free, React-free.
 *
 * The panel has to answer four questions at once: which language is *stored on
 * the account*, which one the reader has *picked but not saved*, whether a save
 * is in flight, and which language the save feedback itself should be written
 * in. Holding those in four independent `useState` cells let them drift — most
 * visibly at hydration, where the stored language was read from browser storage
 * inside a `useState` initializer, so the value depended on *when* the component
 * happened to first render and could never be corrected afterwards.
 *
 * So the rules live here instead, as transitions over one immutable value:
 *
 *   - The state is seeded from a locale the caller already holds
 *     ({@link initialLanguagePreference}) — never from storage. Rendering stays
 *     a pure function of props/state, which is what makes the server render and
 *     the first client render agree.
 *   - The account's stored locale arrives *after* mount, and again whenever the
 *     session changes, through {@link syncSavedLocale}. Late and repeated
 *     hydration is the normal path, not an edge case.
 *   - `saving → saved → idle` and `saving → error` are the only feedback
 *     transitions, and each carries the locale its message must be rendered in
 *     (see {@link LanguageSaveStatus}).
 *
 * Every transition returns the *same object reference* when it would not change
 * anything, so an effect that re-syncs on each session event cannot force a
 * re-render loop.
 */

import type { SupportedLocale } from './locale';

/**
 * Save feedback, and the language that feedback speaks.
 *
 * The locale is carried on the status rather than read from the surrounding UI
 * because the two legitimately differ: a failed switch to English leaves the app
 * in Korean, and the banner still reports on the *attempted* language. Pinning
 * it at transition time is what stops the message from silently re-translating
 * itself when the app locale changes underneath it.
 */
export type LanguageSaveStatus =
  | { readonly kind: 'idle' }
  /** A save is in flight for `locale`; controls are locked until it settles. */
  | { readonly kind: 'saving'; readonly locale: SupportedLocale }
  /** The account now stores `locale`; the confirmation is written in it. */
  | { readonly kind: 'saved'; readonly locale: SupportedLocale }
  /** Saving `locale` failed; the pick is kept so the reader can retry. */
  | { readonly kind: 'error'; readonly locale: SupportedLocale };

export interface LanguagePreferenceState {
  /** Locale currently stored on the account, as last observed. */
  readonly saved: SupportedLocale;
  /** Locale shown as chosen in the control — equal to {@link saved} when clean. */
  readonly selected: SupportedLocale;
  readonly status: LanguageSaveStatus;
}

/**
 * How long the "saved" confirmation stays on screen before the panel returns to
 * rest. Long enough to be read, short enough that it does not linger over the
 * next interaction; the caller owns the timer, this module owns the number so
 * the duration and the transition that clears it stay together.
 */
export const SAVE_NOTICE_DURATION_MS = 3000;

/** Shared idle status — reused so a no-op transition can stay reference-equal. */
const IDLE: LanguageSaveStatus = { kind: 'idle' };

/**
 * Rest state for a reader whose account locale is not known yet.
 *
 * `locale` is the language the app is *already rendering in* (the resolved
 * app locale), which is the only honest placeholder: it shows the control
 * agreeing with the screen around it rather than guessing at stored data.
 * {@link syncSavedLocale} corrects it once the session is readable.
 */
export function initialLanguagePreference(locale: SupportedLocale): LanguagePreferenceState {
  return { saved: locale, selected: locale, status: IDLE };
}

/** The reader has picked a language that is not the stored one. */
export function isDirty(state: LanguagePreferenceState): boolean {
  return state.selected !== state.saved;
}

/** A save request is in flight. */
export function isSaving(state: LanguagePreferenceState): boolean {
  return state.status.kind === 'saving';
}

/**
 * There is an unsaved pick and nothing in flight — the single condition that
 * enables *both* the save and the discard action, since they act on the same
 * pending change.
 */
export function hasPendingChange(state: LanguagePreferenceState): boolean {
  return isDirty(state) && !isSaving(state);
}

/**
 * Pick a language. Clears any stale save feedback, because the moment the reader
 * touches the control, the previous attempt's outcome stops describing the
 * screen. Ignored while a save is in flight: that request already owns the
 * selection until it settles.
 */
export function selectLocale(
  state: LanguagePreferenceState,
  locale: SupportedLocale,
): LanguagePreferenceState {
  if (isSaving(state)) return state;
  if (state.selected === locale && state.status.kind === 'idle') return state;
  return { ...state, selected: locale, status: IDLE };
}

/**
 * Adopt the locale stored on the account — post-mount hydration and every later
 * session change run through here.
 *
 * `null`/`undefined` means "the session could not be read", which is not
 * evidence of any locale, so the current state stands rather than being reset to
 * a guess. An incoming value equal to the stored one is likewise a no-op: it
 * covers the panel's own save echoing back as a session event, and leaves an
 * unsaved pick untouched.
 *
 * A *different* value, though, means the account this panel is describing has
 * changed underneath it (another sign-in, or the locale updated elsewhere), so
 * it wins over an unsaved pick — showing the previous session's pick against the
 * new account's stored value would be a lie about what is saved. An in-flight
 * save keeps its status so the controls do not unlock mid-request.
 */
export function syncSavedLocale(
  state: LanguagePreferenceState,
  locale: SupportedLocale | null | undefined,
): LanguagePreferenceState {
  if (!locale || locale === state.saved) return state;
  return { saved: locale, selected: locale, status: isSaving(state) ? state.status : IDLE };
}

/**
 * Enter the in-flight state for the current pick. A no-op when there is nothing
 * to save or a save is already running, so a double-submit cannot open a second
 * request.
 */
export function beginSave(state: LanguagePreferenceState): LanguagePreferenceState {
  if (!hasPendingChange(state)) return state;
  return { ...state, status: { kind: 'saving', locale: state.selected } };
}

/**
 * Settle a save with the locale the **server** confirmed. The server's value is
 * adopted verbatim rather than assuming the request's own locale came back, so
 * the panel reports what is actually stored.
 */
export function completeSave(
  state: LanguagePreferenceState,
  locale: SupportedLocale,
): LanguagePreferenceState {
  return { saved: locale, selected: locale, status: { kind: 'saved', locale } };
}

/**
 * Settle a save as failed. `saved` deliberately does not move — the request did
 * not change the account — and the pick is kept, so the panel stays dirty and
 * the retry action is a real retry of the same change.
 */
export function failSave(state: LanguagePreferenceState): LanguagePreferenceState {
  const attempted = state.status.kind === 'saving' ? state.status.locale : state.selected;
  return { ...state, status: { kind: 'error', locale: attempted } };
}

/**
 * Retire the "saved" confirmation once it has been on screen long enough. Only
 * that status is transient; an error stays until the reader acts on it.
 */
export function dismissSaveNotice(state: LanguagePreferenceState): LanguagePreferenceState {
  if (state.status.kind !== 'saved') return state;
  return { ...state, status: IDLE };
}
