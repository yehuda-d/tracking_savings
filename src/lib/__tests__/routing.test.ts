import { resolveRoute, type RouteState } from '../routing';

const s = (over: Partial<RouteState>): RouteState => ({
  authLoading: false,
  hasSession: true,
  household: 'some',
  currentGroup: 'app',
  ...over,
});

describe('resolveRoute', () => {
  it('waits while auth is loading', () => {
    expect(resolveRoute(s({ authLoading: true, hasSession: false }))).toBeNull();
  });
  it('sends signed-out users in the app to sign-in', () => {
    expect(resolveRoute(s({ hasSession: false, household: 'none' }))).toBe('/sign-in');
  });
  it('sends signed-out users on onboarding to sign-in', () => {
    expect(resolveRoute(s({ hasSession: false, household: 'none', currentGroup: 'onboarding' }))).toBe('/sign-in');
  });
  it('keeps signed-out users on auth screens', () => {
    expect(resolveRoute(s({ hasSession: false, household: 'none', currentGroup: 'auth' }))).toBeNull();
  });
  it('waits while the household loads', () => {
    expect(resolveRoute(s({ household: 'loading' }))).toBeNull();
  });
  it('sends users without a household to onboarding', () => {
    expect(resolveRoute(s({ household: 'none' }))).toBe('/onboarding');
    expect(resolveRoute(s({ household: 'none', currentGroup: 'auth' }))).toBe('/onboarding');
  });
  it('keeps users without a household on onboarding', () => {
    expect(resolveRoute(s({ household: 'none', currentGroup: 'onboarding' }))).toBeNull();
  });
  it('sends users with a household home from auth or onboarding', () => {
    expect(resolveRoute(s({ currentGroup: 'auth' }))).toBe('/');
    expect(resolveRoute(s({ currentGroup: 'onboarding' }))).toBe('/');
  });
  it('keeps users with a household in the app', () => {
    expect(resolveRoute(s({}))).toBeNull();
  });
  it('stays put on household error so the screen can show retry', () => {
    expect(resolveRoute(s({ household: 'error', currentGroup: 'auth' }))).toBeNull();
  });
});
