import { Page } from '@playwright/test';

export interface RecordedCall {
  method: string;
  url: string;
  status: number;
}

/** Third-party noise the rules say to ignore. */
const IGNORED = [/fonts\.gstatic\.com/, /fonts\.googleapis\.com/];

/**
 * Records API and XHR traffic for `@network` scenarios. Attach before navigating.
 * Responses served by the scrubbing route still fire a response event, so
 * interception does not hide traffic from these assertions.
 */
export class NetworkRecorder {
  private readonly calls: RecordedCall[] = [];

  constructor(page: Page) {
    page.on('response', (response) => {
      const url = response.url();
      if (IGNORED.some((pattern) => pattern.test(url))) return;
      this.calls.push({
        method: response.request().method(),
        url,
        status: response.status(),
      });
    });
  }

  all(): RecordedCall[] {
    return [...this.calls];
  }

  matching(pattern: RegExp): RecordedCall[] {
    return this.calls.filter((call) => pattern.test(call.url));
  }

  /** Human-readable list for assertion messages. */
  describe(): string {
    return this.calls.map((c) => `${c.method} ${c.status} ${c.url}`).join('\n');
  }
}
