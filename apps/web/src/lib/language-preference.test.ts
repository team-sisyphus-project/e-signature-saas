/**
 * Language-preference state unit tests.
 *
 * These pin the contract the settings panel rests on:
 *   • seeding is pure — the initial state is a function of its argument alone,
 *     which is what lets the server render and the first client render agree;
 *   • the account's stored locale can arrive late and repeatedly (mount, then
 *     every session change) without clobbering the reader or looping React;
 *   • `saving → saved → idle` and `saving → error` behave, and each message
 *     keeps the locale it must be written in;
 *   • no transition mutates its input.
 *
 * Runs in the `node` jest environment. That is itself part of the point: the
 * module must be reachable without a DOM, so nothing in it can be tempted to
 * read browser storage during render.
 */

import {
  SAVE_NOTICE_DURATION_MS,
  beginSave,
  completeSave,
  dismissSaveNotice,
  failSave,
  hasPendingChange,
  initialLanguagePreference,
  isDirty,
  isSaving,
  selectLocale,
  syncSavedLocale,
  type LanguagePreferenceState,
} from './language-preference';

/** A rest state whose account locale is already known to be `ko`. */
function korean(): LanguagePreferenceState {
  return initialLanguagePreference('ko');
}

/** Rest state with an unsaved pick of `en` over a stored `ko`. */
function pickedEnglish(): LanguagePreferenceState {
  return selectLocale(korean(), 'en');
}

describe('initialLanguagePreference', () => {
  it('seeds both sides from the given locale and starts idle', () => {
    expect(initialLanguagePreference('en')).toEqual({
      saved: 'en',
      selected: 'en',
      status: { kind: 'idle' },
    });
  });

  it('is deterministic — the seed depends on nothing but its argument', () => {
    // `window`/`localStorage` do not exist in this environment. A seed that read
    // the session would have to throw or branch here; a pure one cannot tell.
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(initialLanguagePreference('ko')).toEqual(initialLanguagePreference('ko'));
  });

  it('starts clean — nothing to save, nothing in flight', () => {
    const state = korean();
    expect(isDirty(state)).toBe(false);
    expect(isSaving(state)).toBe(false);
    expect(hasPendingChange(state)).toBe(false);
  });
});

describe('selectLocale', () => {
  it('marks the pick as pending without touching the stored locale', () => {
    const state = pickedEnglish();
    expect(state).toEqual({ saved: 'ko', selected: 'en', status: { kind: 'idle' } });
    expect(hasPendingChange(state)).toBe(true);
  });

  it('picking the stored locale again clears the pending change', () => {
    expect(hasPendingChange(selectLocale(pickedEnglish(), 'ko'))).toBe(false);
  });

  it('clears stale save feedback, because the outcome no longer describes the screen', () => {
    const failed = failSave(beginSave(pickedEnglish()));
    expect(failed.status).toEqual({ kind: 'error', locale: 'en' });
    expect(selectLocale(failed, 'ko').status).toEqual({ kind: 'idle' });
  });

  it('is ignored while a save is in flight — that request owns the selection', () => {
    const saving = beginSave(pickedEnglish());
    expect(selectLocale(saving, 'ko')).toBe(saving);
  });

  it('is a no-op at rest, so a repeated click cannot force a re-render', () => {
    const state = korean();
    expect(selectLocale(state, 'ko')).toBe(state);
  });
});

describe('syncSavedLocale', () => {
  it('adopts the account locale that arrives after mount', () => {
    // The panel seeded from the app locale (`ko`); the session says `en`.
    expect(syncSavedLocale(korean(), 'en')).toEqual({
      saved: 'en',
      selected: 'en',
      status: { kind: 'idle' },
    });
  });

  it('ignores an unreadable session instead of resetting to a guess', () => {
    const state = pickedEnglish();
    expect(syncSavedLocale(state, null)).toBe(state);
    expect(syncSavedLocale(state, undefined)).toBe(state);
  });

  it('is a no-op when the session repeats the locale already stored', () => {
    // The panel's own save echoes back as a session event; an unsaved pick made
    // in the meantime must survive it, and React must not be handed new state.
    const state = pickedEnglish();
    expect(syncSavedLocale(state, 'ko')).toBe(state);
  });

  it('a different account locale wins over an unsaved pick', () => {
    // Signing in as someone else must not leave the previous reader's pick
    // displayed against the new account's stored value.
    expect(syncSavedLocale(pickedEnglish(), 'en')).toEqual({
      saved: 'en',
      selected: 'en',
      status: { kind: 'idle' },
    });
  });

  it('clears stale error feedback when the session changes underneath it', () => {
    const failed = failSave(beginSave(pickedEnglish()));
    expect(syncSavedLocale(failed, 'en').status).toEqual({ kind: 'idle' });
  });

  it('keeps an in-flight save in flight so the controls stay locked', () => {
    const saving = beginSave(pickedEnglish());
    const synced = syncSavedLocale(saving, 'en');
    expect(synced.status).toEqual({ kind: 'saving', locale: 'en' });
    expect(synced.saved).toBe('en');
  });
});

describe('beginSave', () => {
  it('enters the in-flight state for the current pick', () => {
    expect(beginSave(pickedEnglish())).toEqual({
      saved: 'ko',
      selected: 'en',
      status: { kind: 'saving', locale: 'en' },
    });
  });

  it('refuses when there is nothing to save', () => {
    const state = korean();
    expect(beginSave(state)).toBe(state);
  });

  it('refuses a second time, so a double submit cannot open two requests', () => {
    const saving = beginSave(pickedEnglish());
    expect(beginSave(saving)).toBe(saving);
  });
});

describe('completeSave', () => {
  it('adopts the locale the server confirmed and reports it in that language', () => {
    expect(completeSave(beginSave(pickedEnglish()), 'en')).toEqual({
      saved: 'en',
      selected: 'en',
      status: { kind: 'saved', locale: 'en' },
    });
  });

  it('trusts the server over the request when the two disagree', () => {
    // The account is what the panel describes, so a server that stored `ko`
    // leaves the panel showing `ko` — not the `en` that was asked for.
    const settled = completeSave(beginSave(pickedEnglish()), 'ko');
    expect(settled).toEqual({ saved: 'ko', selected: 'ko', status: { kind: 'saved', locale: 'ko' } });
    expect(hasPendingChange(settled)).toBe(false);
  });
});

describe('failSave', () => {
  it('reports the attempted locale and leaves the account untouched', () => {
    const failed = failSave(beginSave(pickedEnglish()));
    expect(failed).toEqual({
      saved: 'ko',
      selected: 'en',
      status: { kind: 'error', locale: 'en' },
    });
  });

  it('keeps the pick pending so the retry action is a real retry', () => {
    const failed = failSave(beginSave(pickedEnglish()));
    expect(hasPendingChange(failed)).toBe(true);
    expect(beginSave(failed).status).toEqual({ kind: 'saving', locale: 'en' });
  });

  it('falls back to the current pick when no save was in flight', () => {
    expect(failSave(pickedEnglish()).status).toEqual({ kind: 'error', locale: 'en' });
  });
});

describe('dismissSaveNotice', () => {
  it('returns the panel to rest after the confirmation has been shown', () => {
    const saved = completeSave(beginSave(pickedEnglish()), 'en');
    expect(dismissSaveNotice(saved).status).toEqual({ kind: 'idle' });
  });

  it('leaves an error alone — it stays until the reader acts on it', () => {
    const failed = failSave(beginSave(pickedEnglish()));
    expect(dismissSaveNotice(failed)).toBe(failed);
  });

  it('is a no-op at rest', () => {
    const state = korean();
    expect(dismissSaveNotice(state)).toBe(state);
  });

  it('publishes a notice duration that is readable but not lingering', () => {
    expect(SAVE_NOTICE_DURATION_MS).toBeGreaterThanOrEqual(2000);
    expect(SAVE_NOTICE_DURATION_MS).toBeLessThanOrEqual(6000);
  });
});

describe('state discipline', () => {
  it('no transition mutates its input', () => {
    const state = pickedEnglish();
    const snapshot = JSON.parse(JSON.stringify(state)) as LanguagePreferenceState;

    selectLocale(state, 'ko');
    syncSavedLocale(state, 'en');
    beginSave(state);
    completeSave(state, 'en');
    failSave(state);
    dismissSaveNotice(state);

    expect(state).toEqual(snapshot);
  });

  it('runs the whole panel lifecycle: hydrate → pick → save → confirm → rest', () => {
    // Seeded from the app locale before the session is readable.
    let state = initialLanguagePreference('ko');
    // Mount effect reads the session: the account already stores `ko`.
    state = syncSavedLocale(state, 'ko');
    expect(hasPendingChange(state)).toBe(false);

    state = selectLocale(state, 'en');
    state = beginSave(state);
    expect(isSaving(state)).toBe(true);

    // `updateLocale` writes the session and fires its change event before the
    // caller's promise resolves, so the listener runs first.
    state = syncSavedLocale(state, 'en');
    expect(isSaving(state)).toBe(true);

    state = completeSave(state, 'en');
    expect(state.status).toEqual({ kind: 'saved', locale: 'en' });

    state = dismissSaveNotice(state);
    expect(state).toEqual({ saved: 'en', selected: 'en', status: { kind: 'idle' } });
  });
});
