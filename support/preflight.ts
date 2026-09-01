import { request } from '@playwright/test';
import { config } from './config';
import { recordApiHit } from './apiCallLog';

export interface PreflightResult {
  appOrigin: { url: string; status: number };
  apiOrigin: { url: string; status: number };
}

let cached: PreflightResult | undefined;

function unreachable(label: string, url: string, cause: unknown): Error {
  const host = new URL(url).host;
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(
    [
      `Preflight failed: cannot reach the ${label} at ${host}.`,
      `  URL:   ${url}`,
      `  Cause: ${detail}`,
      '',
      host.includes('.internal.')
        ? 'This is an internal host. Check VPN or run from a machine inside the network.'
        : 'Check the URL and your network connection.',
      'Override with BASE_URL / API_BASE_URL in .env if the environment moved.',
    ].join('\n'),
  );
}

/**
 * FND-2 / D5. Proves both origins answer before any scenario runs, so an
 * unreachable environment fails once with a clear message instead of surfacing
 * as dozens of confusing timeouts.
 *
 * Any HTTP status counts as reachable — a 401 from the API is a successful
 * round trip. Only transport-level failures are treated as unreachable.
 */
export async function preflight(): Promise<PreflightResult> {
  if (cached) return cached;

  const api = await request.newContext();
  try {
    const appUrl = `${config.baseUrl}/runtime-config.json`;
    let appStatus: number;
    try {
      const appRes = await api.get(appUrl, { timeout: 20_000 });
      appStatus = appRes.status();
      recordApiHit({ method: 'GET', url: appRes.url(), status: appStatus, source: 'client' });
    } catch (cause) {
      throw unreachable('application', appUrl, cause);
    }
    if (appStatus >= 400) {
      throw new Error(
        `Preflight failed: ${appUrl} returned ${appStatus}. Expected the front-end runtime config to be served.`,
      );
    }

    const apiUrl = `${config.apiBaseUrl}/accounts/v1/members/me/staff-role`;
    let apiStatus: number;
    try {
      const apiRes = await api.get(apiUrl, { timeout: 20_000 });
      apiStatus = apiRes.status();
      recordApiHit({ method: 'GET', url: apiRes.url(), status: apiStatus, source: 'client' });
    } catch (cause) {
      throw unreachable('API gateway', apiUrl, cause);
    }

    cached = {
      appOrigin: { url: appUrl, status: appStatus },
      apiOrigin: { url: apiUrl, status: apiStatus },
    };
    return cached;
  } finally {
    await api.dispose();
  }
}
