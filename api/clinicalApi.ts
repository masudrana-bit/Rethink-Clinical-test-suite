import { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../support/config';

/**
 * Thin typed wrapper over the Rethink Clinical API.
 * Endpoints mirror rules/10-app-context.md. Add methods as new units are built.
 */
export class ClinicalApi {
  constructor(private api: APIRequestContext, private token?: string) {}

  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async login(username: string, password: string): Promise<APIResponse> {
    return this.api.post(`${config.authBaseUrl}/login`, {
      data: {
        userName: username,
        password,
        applicationKey: config.appKey,
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<APIResponse> {
    return this.api.post(`${config.authBaseUrl}/refresh-token`, {
      data: { refreshToken },
    });
  }

  staffRole(): Promise<APIResponse> {
    return this.api.get(`${config.apiBaseUrl}/accounts/v1/members/me/staff-role`, {
      headers: this.headers(),
    });
  }

  clients(page = 1, pageSize = 200): Promise<APIResponse> {
    return this.api.get(
      `${config.apiBaseUrl}/clinical/v1/clients?page=${page}&pageSize=${pageSize}`,
      { headers: this.headers() },
    );
  }

  programs(clientId: number): Promise<APIResponse> {
    return this.api.get(
      `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs`,
      { headers: this.headers() },
    );
  }

  targets(clientId: number, programId: number): Promise<APIResponse> {
    return this.api.get(
      `${config.apiBaseUrl}/clinical/v1/clients/${clientId}/programs/${programId}/targets`,
      { headers: this.headers() },
    );
  }

  behaviorPlans(clientId: number): Promise<APIResponse> {
    return this.api.get(
      `${config.apiBaseUrl}/observations/v1/client/${clientId}/behaviorplans`,
      { headers: this.headers() },
    );
  }
}
