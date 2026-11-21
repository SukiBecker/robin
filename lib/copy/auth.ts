/**
 * All user-facing text for the auth pages.
 * Source of truth: docs/auth-copy.md — keep keys and wording in sync with it.
 */

const common = {
  brand: "Robin",
  showPassword: "Show password",
  hidePassword: "Hide password",
  backToSignIn: "Back to sign in",
  spamHint: "Can't find it? Check your spam folder.",
  errors: {
    network: "Couldn't reach Robin. Check your connection and try again.",
    rateLimit: "Too many attempts. Take a short break and try again in a minute.",
    unknown: "Something went wrong. Please try again.",
  },
} as const;

const validation = {
  emailRequired: "Please enter your email.",
  emailInvalid: "That doesn't look like a valid email.",
  passwordRequired: "Please enter your password.",
  passwordTooShort: (min: number) => `Use at least ${min} characters.`,
  passwordsDontMatch: "Passwords don't match.",
  displayNameRequired: "Please enter a name.",
} as const;

const signIn = {
  title: "Welcome back",
  subtitle: "Your garden missed you.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  forgotPassword: "Forgot password?",
  submit: "Sign in",
  submitting: "Signing in…",
  footerText: "New to Robin?",
  footerLink: "Create an account",
  errors: {
    invalidCredentials: "Email or password is incorrect.",
    emailNotConfirmed:
      "Please confirm your email first. We sent you a link when you signed up.",
  },
  resend: "Resend confirmation email",
} as const;

const signUp = {
  title: "Start your garden",
  /** Robin's note on the left page (RobinNote, his voice). */
  note: "Every minute you study, something grows.",
  /** Photo collage: the places of the journey, in level order (§9).
      Two lines under each photo: the name, then the level ("Lv 10"). */
  places: {
    label: "Places on the journey",
    garden: "The Garden",
    beach: "Beach",
    mountains: "Mountains",
    desert: "Desert",
    japaneseGarden: "Japanese Garden",
    level: (level: number) => `Lv\u00a0${level}`,
  },
  /** The core loop under the photos. */
  loop: {
    label: "How it works",
    study: "Study",
    earn: "Earn",
    grow: "Grow",
  },
  displayNameLabel: "This journal belongs to…",
  displayNameHelp: "This is how Robin will greet you.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  passwordHelp: (min: number) => `At least ${min} characters.`,
  confirmPasswordLabel: "Confirm password",
  submit: "Create account",
  submitting: "Creating account…",
  footerText: "Already have an account?",
  footerLink: "Sign in",
  errors: {
    weakPassword: "This password is too weak. Try a longer one.",
  },
  success: {
    title: "Check your inbox",
    body: (email: string) =>
      `We sent a confirmation link to ${email}. Open it to finish setting up your account.`,
    hint: common.spamHint,
    resend: "Resend email",
    resendCountdown: (seconds: number) => `Resend in ${seconds}s`,
    resent: "Sent! Check your inbox again.",
    link: common.backToSignIn,
  },
} as const;

const confirmEmail = {
  loadingTitle: "Confirming your email…",
  loadingBody: "This only takes a moment.",
  invalid: {
    title: "This link didn't work",
    body: "It may have expired or already been used. Sign in and we'll send you a fresh one.",
    primary: "Sign in",
    secondary: "Create a new account",
  },
} as const;

const resetRequest = {
  title: "Forgot your password?",
  subtitle: "No worries. Enter your email and we'll send you a reset link.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  submit: "Send reset link",
  submitting: "Sending…",
  footerLink: common.backToSignIn,
  success: {
    title: "Check your inbox",
    body: (email: string) =>
      `If an account exists for ${email}, a reset link is on its way.`,
    hint: common.spamHint,
    link: common.backToSignIn,
  },
} as const;

const newPassword = {
  verifying: "Checking your link…",
  title: "Set a new password",
  subtitle: "Pick something you'll remember.",
  passwordLabel: "New password",
  passwordHelp: (min: number) => `At least ${min} characters.`,
  confirmPasswordLabel: "Confirm new password",
  submit: "Save password",
  submitting: "Saving…",
  errors: {
    weakPassword: "This password is too weak. Try a longer one.",
    samePassword: "Your new password needs to be different from your old one.",
    sessionExpired: "This session has expired. Request a new link to try again.",
    sessionExpiredAction: "Request a new link",
  },
  invalid: {
    title: "This link didn't work",
    body: "Reset links expire after a while and can only be used once.",
    primary: "Request a new link",
    secondary: common.backToSignIn,
  },
  success: {
    title: "Password updated",
    body: "You're all set. Your new password is active.",
    primary: "Continue to your garden",
  },
} as const;

export const authCopy = {
  common,
  validation,
  signIn,
  signUp,
  confirmEmail,
  resetRequest,
  newPassword,
} as const;
