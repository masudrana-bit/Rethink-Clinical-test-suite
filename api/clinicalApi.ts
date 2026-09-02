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

  programLibrary(): Promise<APIResponse> {
    return this.track(
      'GET',
      this.api.get(`${config.apiBaseUrl}/clinical/v1/program-library`, {
        headers: this.headers(),
      }),
    );
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
