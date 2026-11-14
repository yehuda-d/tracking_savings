export type RouteGroup = 'auth' | 'onboarding' | 'app';

export interface RouteState {
  authLoading: boolean;
  hasSession: boolean;
  household: 'loading' | 'none' | 'some' | 'error';
  currentGroup: RouteGroup;
}

export type RouteTarget = '/sign-in' | '/onboarding' | '/';

/** Where the user should be, or null to stay on the current screen. */
export function resolveRoute(s: RouteState): RouteTarget | null {
  if (s.authLoading) return null;
  if (!s.hasSession) return s.currentGroup === 'auth' ? null : '/sign-in';
  if (s.household === 'loading' || s.household === 'error') return null;
  if (s.household === 'none') return s.currentGroup === 'onboarding' ? null : '/onboarding';
  return s.currentGroup === 'app' ? null : '/';
}
