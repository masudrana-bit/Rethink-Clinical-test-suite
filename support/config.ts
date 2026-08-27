import * as dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}. See .env.example`);
  return v;
}

export const config = {
  baseUrl: process.env.BASE_URL ?? 'https://clinical.dev2.rethinkbhtech.com',
  apiBaseUrl:
    process.env.API_BASE_URL ??
    'https://dev2.internal.rethinkbhtech.com/mobile-gateway-api',
  authBaseUrl:
    process.env.AUTH_BASE_URL ??
    'https://dev2.internal.rethinkbhtech.com/mobile-security/api/v1/auth',
  // Read lazily so pure @ui runs that don't need API creds still boot.
  get username() { return required('TEST_USERNAME'); },
  get password() { return required('TEST_PASSWORD'); },
  get appKey() { return required('AUTH_APPLICATION_KEY'); },
  testClientId: process.env.TEST_CLIENT_ID,
};
