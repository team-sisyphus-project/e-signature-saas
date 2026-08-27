import type { WebTranslationDomain } from './types';

/**
 * Sign-in and sign-up copy: the login form, its inline validation, and the
 * links between the two screens.
 *
 * Korean keeps the product's base voice (plain 해요체, calm, never blaming).
 * English follows standard SaaS UX conventions — short, declarative, sentence
 * case — rather than transliterating the Korean politeness.
 */
export const AUTH_TRANSLATIONS = {
  // --- login form ---------------------------------------------------------
  loginTitle: { ko: '다시 오셨네요', en: 'Welcome back' },
  loginHint: {
    ko: '이메일과 비밀번호로 로그인해 주세요.',
    en: 'Sign in with your email and password.',
  },
  email: { ko: '이메일', en: 'Email' },
  password: { ko: '비밀번호', en: 'Password' },
  login: { ko: '로그인', en: 'Sign in' },
  /** Button label while the request is in flight. */
  loggingIn: { ko: '로그인 중', en: 'Signing in' },
  googleLogin: { ko: 'Google로 로그인', en: 'Continue with Google' },

  // --- sign-up cross-link -------------------------------------------------
  noAccount: { ko: '아직 계정이 없으신가요?', en: 'New here?' },
  signup: { ko: '회원가입', en: 'Create an account' },

  // --- inline validation --------------------------------------------------
  // States what to do next instead of naming the user's mistake.
  emailRequired: { ko: '이메일을 입력해 주세요.', en: 'Enter your email address.' },
  emailInvalid: { ko: '이메일 형식을 다시 확인해 주세요.', en: 'Check your email address.' },
  passwordRequired: { ko: '비밀번호를 입력해 주세요.', en: 'Enter your password.' },

  // --- shared auth chrome -------------------------------------------------
  /** Separator between the email form and the social sign-in area. */
  or: { ko: '또는', en: 'or' },
  /** Accessible names of the password field's reveal toggle (states the action). */
  passwordShow: { ko: '비밀번호 표시', en: 'Show password' },
  passwordHide: { ko: '비밀번호 숨기기', en: 'Hide password' },
  /** Screen-reader status on the root gate while the session is being read. */
  checkingSession: {
    ko: '로그인 상태를 확인하고 있어요.',
    en: 'Checking your sign-in status.',
  },

  // --- sign-up form -------------------------------------------------------
  signupTitle: { ko: '시작해 볼까요', en: 'Get started' },
  signupHint: {
    ko: '이메일과 비밀번호로 계정을 만들어 주세요.',
    en: 'Create an account with your email and password.',
  },
  passwordConfirm: { ko: '비밀번호 확인', en: 'Confirm password' },
  passwordConfirmPlaceholder: {
    ko: '비밀번호를 다시 입력해 주세요',
    en: 'Re-enter your password',
  },
  /** Field hint under the password input. `{min}` is the server's minimum length. */
  passwordHint: {
    ko: '{min}자 이상 입력해 주세요.',
    en: 'Use at least {min} characters.',
  },
  /**
   * One sentence, one key. The Korean original emphasised "이용약관" and
   * "개인정보 처리방침" with inline spans; neither was a link, and splitting the
   * sentence to keep that emphasis would fix Korean word order onto every other
   * language (voice guide §2).
   */
  signupTerms: {
    ko: '이용약관 및 개인정보 처리방침에 동의해요.',
    en: 'I agree to the Terms of Service and the Privacy Policy.',
  },
  signupSubmit: { ko: '가입하기', en: 'Create account' },
  /** Button label while the request is in flight. */
  signingUp: { ko: '가입 중', en: 'Creating account' },
  googleSignup: { ko: 'Google로 시작하기', en: 'Continue with Google' },
  /** Success beat shown for a moment before the dashboard handoff. */
  signupSuccessTitle: { ko: '가입이 완료되었습니다!', en: 'Account created' },
  signupSuccessBody: {
    ko: '대시보드로 이동하고 있어요.',
    en: 'Taking you to your dashboard.',
  },

  // --- sign-in cross-link -------------------------------------------------
  hasAccount: { ko: '이미 계정이 있으신가요?', en: 'Already have an account?' },

  // --- sign-up validation -------------------------------------------------
  passwordTooShort: {
    ko: '비밀번호는 {min}자 이상으로 입력해 주세요.',
    en: 'Use at least {min} characters for your password.',
  },
  passwordConfirmRequired: {
    ko: '비밀번호를 한 번 더 입력해 주세요.',
    en: 'Re-enter your password.',
  },
  passwordMismatch: {
    ko: '비밀번호가 일치하지 않아요. 다시 확인해 주세요.',
    en: 'The passwords do not match. Check them again.',
  },
  termsRequired: {
    ko: '약관에 동의해야 가입할 수 있어요.',
    en: 'Agree to the terms to create an account.',
  },

  // --- Google sign-in failures (client-side, before our API is reached) ----
  // `GoogleAuthError` carries the kind; `GOOGLE_AUTH_ERROR_KEYS` maps it here.
  googleCancelled: {
    ko: 'Google 로그인을 취소했어요. 다시 시도해 주세요.',
    en: 'Google sign-in was cancelled. Please try again.',
  },
  googlePopupBlocked: {
    ko: '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.',
    en: 'The popup was blocked. Allow popups in your browser, then try again.',
  },
  googleConnectError: {
    ko: 'Google에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    en: 'We could not reach Google. Please try again shortly.',
  },
} as const satisfies WebTranslationDomain;
