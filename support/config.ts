import * as dotenv from 'dotenv';
dotenv.config();

/**
 * A blank line in .env (`AUTH_APPLICATION_KEY=`) arrives as an empty string, which
 * is truthy enough to shadow a fetched default under `??`. Treat blank as unset.
 */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * D1: the suite authenticates by driving /temp-dev-login, which self-authenticates.
 * Credentials are optional overrides for the day a real service account exists.
 */
export const config = {
  baseUrl: env('BASE_URL') ?? 'https://clinical.dev2.rethinkbhtech.com',
  apiBaseUrl:
    env('API_BASE_URL') ?? 'https://dev2.internal.rethinkbhtech.com/mobile-gateway-api',
  authBaseUrl:
    env('AUTH_BASE_URL') ??
    'https://dev2.internal.rethinkbhtech.com/mobile-security/api/v1/auth',

  username: env('TEST_USERNAME'),
  password: env('TEST_PASSWORD'),
  appKey: env('AUTH_APPLICATION_KEY'),

  /** Escape hatch for debugging a specific client. D2 forbids relying on this in tests. */
  testClientId: env('TEST_CLIENT_ID') ? Number(env('TEST_CLIENT_ID')) : undefined,

  headless: env('HEADED') !== '1',

  /** Rewrite PNGs under visual/baselines. Used by `@visual` (Unit 12). */
  updateVisual: env('UPDATE_VISUAL') === '1',

  /** localStorage key holding the app's auth session. */
  authStorageKey: 'bh_clinical_auth_session',
};

/** The application key is fetched from /runtime-config.json, so it is not required here. */
export function hasCredentials(): boolean {
  return Boolean(config.username && config.password);
}
