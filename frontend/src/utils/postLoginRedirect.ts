/**
 * "Return to where I was" after login/register.
 *
 * Public pages that need the user to sign in first (invite links, shared posts) call
 * rememberPostLoginRedirect() before sending them to /login. LoginForm, RegisterForm and
 * AuthCallback then call consumePostLoginRedirect() to pick the destination.
 *
 * Only same-origin relative paths are honoured, so a crafted value can never bounce the user
 * to another site (classic open-redirect guard).
 */

export const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';
const DEFAULT_DESTINATION = '/dashboard';

const isSafeRelativePath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && !value.includes('://');

export const rememberPostLoginRedirect = (path?: string): void => {
  const target = path ?? `${window.location.pathname}${window.location.search}`;
  if (!isSafeRelativePath(target)) return;
  try {
    sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, target);
  } catch {
    // sessionStorage can be unavailable (private mode / storage disabled) - fall back to default
  }
};

/** Reads and clears the stored destination. Falls back to /dashboard. */
export const consumePostLoginRedirect = (fallback: string = DEFAULT_DESTINATION): string => {
  try {
    const stored = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
    sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
    if (stored && isSafeRelativePath(stored) && !stored.startsWith('/login') && !stored.startsWith('/register')) {
      return stored;
    }
  } catch {
    // ignore
  }
  return fallback;
};
