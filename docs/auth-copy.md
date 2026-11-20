# Robin – Auth Copy (V1)

All user-facing text for the five auth pages. Language: English only.
Tone: warm, short, no jargon. Robin = mascot mood shown next to the card.

Placeholders in curly braces are filled in at runtime: `{email}`, `{min}` (minimum password length from Supabase), `{seconds}`.

---

## Shared

| Key | Text |
| --- | --- |
| `common.brand` | Robin |
| `common.showPassword` | Show password |
| `common.hidePassword` | Hide password |
| `common.backToSignIn` | Back to sign in |
| `common.spamHint` | Can't find it? Check your spam folder. |
| `common.errors.network` | Couldn't reach Robin. Check your connection and try again. |
| `common.errors.rateLimit` | Too many attempts. Take a short break and try again in a minute. |
| `common.errors.unknown` | Something went wrong. Please try again. |

### Field validation

| Key | Text |
| --- | --- |
| `validation.emailRequired` | Please enter your email. |
| `validation.emailInvalid` | That doesn't look like a valid email. |
| `validation.passwordRequired` | Please enter your password. |
| `validation.passwordTooShort` | Use at least {min} characters. |
| `validation.passwordsDontMatch` | Passwords don't match. |
| `validation.displayNameRequired` | Please enter a name. |

---

## Sign in (`/signin`)

| Key | Text | Robin |
| --- | --- | --- |
| `signIn.title` | Welcome back | neutral |
| `signIn.subtitle` | Your garden missed you. | |
| `signIn.emailLabel` | Email | |
| `signIn.emailPlaceholder` | you@example.com | |
| `signIn.passwordLabel` | Password | |
| `signIn.forgotPassword` | Forgot password? | |
| `signIn.submit` | Sign in | |
| `signIn.submitting` | Signing in… | |
| `signIn.footerText` | New to Robin? | |
| `signIn.footerLink` | Create an account | |
| `signIn.errors.invalidCredentials` | Email or password is incorrect. | sad |
| `signIn.errors.emailNotConfirmed` | Please confirm your email first. We sent you a link when you signed up. | neutral |
| `signIn.resend` | Resend confirmation email | |

---

## Sign up (`/signup`)

The first page of Robin's journal: `signUp.title` and `signUp.story` on the left page above a collage (rose stage 1/2/3 with the `signUp.growth.stages` labels — the rose takes 10800 s (3 h) to full bloom per `item_catalog`, stage 2 covers everything between 0 and 100 %, then a pressed bloom; `signUp.growth.label` is its screen-reader text), the form on the right. The success state keeps the "The Garden" stamp with the "Welcome" postmark. `validation.passwordsDontMatch` shows under the confirm-password line, not in the alert.

| Key | Text | Robin |
| --- | --- | --- |
| `signUp.title` | Start your garden | neutral |
| `signUp.story` | Robin plants a garden wherever he stops. This one starts with you. | |
| `signUp.growth.label` | A rose growing from planted to full bloom in 3 hours of study, then pressed into the journal. | |
| `signUp.growth.stages` | Planted · 1 h · 3 h | |
| `signUp.displayNameLabel` | This journal belongs to… | |
| `signUp.displayNameHelp` | This is how Robin will greet you. | |
| `signUp.emailLabel` | Email | |
| `signUp.emailPlaceholder` | you@example.com | |
| `signUp.passwordLabel` | Password | |
| `signUp.passwordHelp` | At least {min} characters. | |
| `signUp.confirmPasswordLabel` | Confirm password | |
| `signUp.submit` | Create account | |
| `signUp.submitting` | Creating account… | |
| `signUp.footerText` | Already have an account? | |
| `signUp.footerLink` | Sign in | |
| `signUp.errors.weakPassword` | This password is too weak. Try a longer one. | neutral |

### Success state (replaces the form)

| Key | Text | Robin |
| --- | --- | --- |
| `signUp.success.title` | Check your inbox | happy |
| `signUp.success.body` | We sent a confirmation link to {email}. Open it to finish setting up your account. | |
| `signUp.success.hint` | → `common.spamHint` | |
| `signUp.success.resend` | Resend email | |
| `signUp.success.resendCountdown` | Resend in {seconds}s | |
| `signUp.success.resent` | Sent! Check your inbox again. | |
| `signUp.success.link` | → `common.backToSignIn` | |

Note: Because email confirmation is on, Supabase does not report an already registered email as an error. No separate text needed.

---

## Confirm email (`/signup/confirm`)

| Key | Text | Robin |
| --- | --- | --- |
| `confirmEmail.loadingTitle` | Confirming your email… | neutral |
| `confirmEmail.loadingBody` | This only takes a moment. | |
| `confirmEmail.invalid.title` | This link didn't work | sad |
| `confirmEmail.invalid.body` | It may have expired or already been used. Sign in and we'll send you a fresh one. | |
| `confirmEmail.invalid.primary` | Sign in | |
| `confirmEmail.invalid.secondary` | Create a new account | |

Success: no text, redirects straight to `/studyroom`.

---

## Forgot password (`/reset-password`)

| Key | Text | Robin |
| --- | --- | --- |
| `resetRequest.title` | Forgot your password? | neutral |
| `resetRequest.subtitle` | No worries. Enter your email and we'll send you a reset link. | |
| `resetRequest.emailLabel` | Email | |
| `resetRequest.emailPlaceholder` | you@example.com | |
| `resetRequest.submit` | Send reset link | |
| `resetRequest.submitting` | Sending… | |
| `resetRequest.footerLink` | → `common.backToSignIn` | |

### Success state (replaces the form)

| Key | Text | Robin |
| --- | --- | --- |
| `resetRequest.success.title` | Check your inbox | happy |
| `resetRequest.success.body` | If an account exists for {email}, a reset link is on its way. | |
| `resetRequest.success.hint` | → `common.spamHint` | |
| `resetRequest.success.link` | → `common.backToSignIn` | |

---

## New password (`/reset-password/confirm`)

| Key | Text | Robin |
| --- | --- | --- |
| `newPassword.verifying` | Checking your link… | neutral |
| `newPassword.title` | Set a new password | neutral |
| `newPassword.subtitle` | Pick something you'll remember. | |
| `newPassword.passwordLabel` | New password | |
| `newPassword.passwordHelp` | At least {min} characters. | |
| `newPassword.confirmPasswordLabel` | Confirm new password | |
| `newPassword.submit` | Save password | |
| `newPassword.submitting` | Saving… | |
| `newPassword.errors.weakPassword` | This password is too weak. Try a longer one. | neutral |
| `newPassword.errors.samePassword` | Your new password needs to be different from your old one. | neutral |
| `newPassword.errors.sessionExpired` | This session has expired. Request a new link to try again. | sad |
| `newPassword.errors.sessionExpiredAction` | Request a new link | |

### Invalid or expired link

| Key | Text | Robin |
| --- | --- | --- |
| `newPassword.invalid.title` | This link didn't work | sad |
| `newPassword.invalid.body` | Reset links expire after a while and can only be used once. | |
| `newPassword.invalid.primary` | Request a new link | |
| `newPassword.invalid.secondary` | → `common.backToSignIn` | |

### Success

| Key | Text | Robin |
| --- | --- | --- |
| `newPassword.success.title` | Password updated | happy |
| `newPassword.success.body` | You're all set. Your new password is active. | |
| `newPassword.success.primary` | Continue to your garden | |

Note: After a successful reset the user already has a session. The button therefore goes to `/studyroom`, not `/signin` (the middleware would redirect from `/signin` anyway).
