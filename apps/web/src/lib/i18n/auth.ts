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
  /** Wordmark shown on the auth screens when no branding logo applies. */
  product: { ko: '전자계약', en: 'eSign' },

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
} as const satisfies WebTranslationDomain;
