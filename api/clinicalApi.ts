import { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../support/config';
import { recordApiResponseHit } from '../support/apiCallLog';

/**
 * Thin typed wrapper over the Rethink Clinical API.
 * Endpoints mirror rules/10-app-context.md. Add methods as new units are built.
 */
export class ClinicalApi {
  constructor(
    private api: APIRequestContext,
    private token?: string,
    /** Required by the auth endpoints; read from /runtime-config.json at runtime. */
    private appKey?: string,
  ) {}

  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async track(method: string, response: Promise<APIResponse>): Promise<APIResponse> {
    const res = await response;
    await recordApiResponseHit(res, method, 'client');
    return res;
  }

  /** Both auth endpoints 401 without x-application-key, per the crawled headers. */
  private authEndpointHeaders(): Record<string, string> {
    if (!this.appKey) {
      throw new Error(
        'This auth endpoint needs an application key. Construct ClinicalApi with one ' +
          'from getRuntimeConfig().',
      );
    }
    return { 'x-application-key': this.appKey };
  }

  /**
   * Body shape taken from the crawl's captured request: lowercase `username`,
   * and no `applicationKey` in the body. Unused under decision D1, kept correct
   * for the day a real service account exists.
   */
  async login(username: string, password: string): Promise<APIResponse> {
    return this.track('POST', this.api.post(`${config.authBaseUrl}/login`, {
      headers: this.authEndpointHeaders(),
      data: { username, password },
    }));
  }

  async refreshToken(refreshToken: string): Promise<APIResponse> {
    return this.track('POST', this.api.post(`${config.authBaseUrl}/refresh-token`, {
      headers: this.authEndpointHeaders(),
      data: { refreshToken },
    }));
  }

  staffRole(): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/accounts/v1/members/me/staff-role`, {
        headers: this.headers(),
      }),
    );
  }

  clients(page = 1, pageSize = 200): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(
        `${config.apiBaseUrl}/clinical/v1/clients?page=${page}&pageSize=${pageSize}`,
        { headers: this.headers() },
      ),
    );
  }

  programs(clientId: number): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs`, {
        headers: this.headers(),
      }),
    );
  }

  targets(clientId: number, programId: number): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/targets`,
        { headers: this.headers() },
      ),
    );
  }

  programLibrary(query: Record<string, string | number | boolean> = {}): Promise<APIResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, String(value));
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/clinical/v1/program-library${suffix}`, {
        headers: this.headers(),
      }),
    );
  }

  /**
   * Clinical PR #37: a standard library program must 409 before any write.
   * If-Match is sent so a missing-precondition 428 cannot hide that refusal.
   */
  patchProgramLibrary(id: number, body: unknown): Promise<APIResponse> {
    return this.track(
      'PATCH',
      this.api.patch(`${config.apiBaseUrl}/clinical/v1/program-library/${id}`, {
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json',
          'If-Match': '*',
        },
        data: body,
      }),
    );
  }

  abcOptions(page = 1, pageSize = 200): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(
        `${config.apiBaseUrl}/clinical/v1/abc-options?page=${page}&pageSize=${pageSize}`,
        { headers: this.headers() },
      ),
    );
  }

  lookup(name: string): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/clinical/v1/lookup/${name}`, {
        headers: this.headers(),
      }),
    );
  }

  dataCollectionScales(page = 1, pageSize = 200): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(
        `${config.apiBaseUrl}/clinical/v1/data-collection-scales?page=${page}&pageSize=${pageSize}`,
        { headers: this.headers() },
      ),
    );
  }

  private clinicalQuery(
    path: string,
    query: Record<string, string | number | boolean | string[]> = {},
  ): Promise<APIResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, item);
      } else {
        params.set(key, String(value));
      }
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}${path}${suffix}`, { headers: this.headers() }),
    );
  }

  analyzeDataSeries(clientId: number): Promise<APIResponse> {
    return this.clinicalQuery('/clinical/v1/reports/analyze-data/series', { clientId });
  }

  analyzeDataMasteredTargets(clientId: number): Promise<APIResponse> {
    return this.clinicalQuery('/clinical/v1/reports/analyze-data/mastered-targets', { clientId });
  }

  analyzeDataGraphs(clientId: number, seriesIds: string[]): Promise<APIResponse> {
    return this.clinicalQuery('/clinical/v1/reports/analyze-data/graphs', {
      clientId,
      seriesIds,
    });
  }

  private programScoped(clientId: number, programId: number, suffix: string): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/${suffix}`,
        { headers: this.headers() },
      ),
    );
  }

  objectives(clientId: number, programId: number): Promise<APIResponse> {
    return this.programScoped(clientId, programId, 'objectives');
  }

  masteryCriteria(clientId: number, programId: number): Promise<APIResponse> {
    return this.programScoped(clientId, programId, 'mastery-criteria');
  }

  targetGroups(clientId: number, programId: number): Promise<APIResponse> {
    return this.programScoped(clientId, programId, 'target-groups');
  }

  dataCollection(clientId: number, programId: number): Promise<APIResponse> {
    return this.programScoped(clientId, programId, 'data-collection');
  }

  /**
   * Gateway PR 49218: these routes skip Bearer and the /clinical/api rewrite.
   * ApplicationKeyHandler still runs, so `x-application-key` is required.
   */
  clinicalHealthcheck(path = '/clinical/healthcheck'): Promise<APIResponse> {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}${suffix}`, {
        headers: { ...this.headers(), ...this.authEndpointHeaders() },
      }),
    );
  }

  automasteryEvaluations(
    clientId: number,
    programId: number,
    status = 'flagged',
  ): Promise<APIResponse> {
    return this.programScoped(
      clientId,
      programId,
      `automastery-evaluations?status=${encodeURIComponent(status)}`,
    );
  }

  behaviorPlans(clientId: number): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/observations/v1/client/${clientId}/behaviorplans`, {
        headers: this.headers(),
      }),
    );
  }

  /**
   * Recon 2026-09-02: POST on this collection returns 405 (no create API).
   * Used only as a non-mutating unknown-client probe (NEG-12).
   */
  createAutomasteryEvaluation(
    clientId: number,
    programId: number,
  ): Promise<APIResponse> {
    return this.track(
      'POST',
      this.api.post(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/automastery-evaluations`,
        {
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          data: { status: 'flagged' },
        },
      ),
    );
  }

  /**
   * Recon 2026-09-02: this path 404s. Probe only — do not treat as a write contract.
   */
  createClientSession(clientId: number): Promise<APIResponse> {
    return this.track(
      'POST',
      this.api.post(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/sessions`,
        {
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          data: {},
        },
      ),
    );
  }

  /**
   * Observed 201 from POST `{ description }`. The server fills objectiveId, status
   * and statusHistory. Do not send a richer body until recon captures one.
   */
  createTarget(
    clientId: number,
    programId: number,
    description: string,
  ): Promise<APIResponse> {
    return this.track(
      'POST',
      this.api.post(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/targets`,
        {
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          data: { description },
        },
      ),
    );
  }

  /**
   * Observed 428 without If-Match; 204 with `If-Match: *`.
   */
  deleteTarget(clientId: number, programId: number, targetId: number): Promise<APIResponse> {
    return this.track(
      'DELETE',
      this.api.delete(
        `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/targets/${targetId}`,
        { headers: { ...this.headers(), 'If-Match': '*' } },
      ),
    );
  }
}
