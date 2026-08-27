import { APIRequestContext } from '@playwright/test';
import { config } from './config';

export interface RuntimeConfig {
  apiBaseUrl: string;
  authApiBaseUrl: string;
  authApplicationKey: string;
}

let cached: RuntimeConfig | undefined;

/**
 * The front-end publishes its own configuration at /runtime-config.json, including
 * the `x-application-key` the auth endpoints demand. Fetching it at runtime keeps
 * the key out of the repo and means the suite follows the environment if it moves.
 * AUTH_APPLICATION_KEY overrides it when set.
 */
export async function getRuntimeConfig(api: APIRequestContext): Promise<RuntimeConfig> {
  if (cached) return cached;

  const url = `${config.baseUrl}/runtime-config.json`;
  const res = await api.get(url);
  if (!res.ok()) {
    throw new Error(`Could not read ${url}: ${res.status()}.`);
  }
  const body = (await res.json()) as Partial<RuntimeConfig>;

  const authApplicationKey = config.appKey ?? body.authApplicationKey;
  if (!authApplicationKey) {
    throw new Error(
      `${url} did not expose authApplicationKey, and AUTH_APPLICATION_KEY is not set. ` +
        'The auth endpoints reject requests without the x-application-key header.',
    );
  }

  cached = {
    apiBaseUrl: body.apiBaseUrl ?? config.apiBaseUrl,
    authApiBaseUrl: body.authApiBaseUrl ?? config.authBaseUrl,
    authApplicationKey,
  };
  return cached;
}

export function resetRuntimeConfigCache(): void {
  cached = undefined;
}
