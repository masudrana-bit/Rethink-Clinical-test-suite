import { When } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { ClinicalApi } from '../api/clinicalApi';
import { getRuntimeConfig } from '../support/runtimeConfig';
import { recordResponseMetadata } from '../support/apiDiagnostics';

/** Gateway PR 49218 — anonymous clinical health routes that still require the app key. */

When(
  'I GET {string} with the application key',
  async function (this: CustomWorld, path: string) {
    const runtime = await getRuntimeConfig(this.api);
    const api = new ClinicalApi(this.api, this.data.token, runtime.authApplicationKey);
    const res = await api.clinicalHealthcheck(path);
    recordResponseMetadata(this, res);
    this.data.lastResponseBody = await res.json().catch(() => undefined);
  },
);
