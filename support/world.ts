import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';
import { ClinicalApi } from '../api/clinicalApi';
import { AppShell } from '../pages/AppShell';
import { ClientsPage } from '../pages/ClientsPage';
import { ClientWorkspace } from '../pages/ClientWorkspace';
import { AnalyzeDataPage } from '../pages/AnalyzeDataPage';
import { BehaviorSupportPage } from '../pages/BehaviorSupportPage';
import { HarvestedAuth } from './auth';
import { ResolvedFixture } from './testData';

export interface TestData {
  token?: string;
  clientId?: number;
  programId?: number;
  lastResponseStatus?: number;
  lastResponseBody?: any;
  lastResponseHeaders?: Record<string, string>;
  [key: string]: any;
}

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api!: APIRequestContext;
  auth!: HarvestedAuth;
  fixture?: ResolvedFixture;
  data: TestData = {};

  private objects = new Map<string, unknown>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  private lazy<T>(key: string, build: () => T): T {
    if (!this.objects.has(key)) this.objects.set(key, build());
    return this.objects.get(key) as T;
  }

  get shell(): AppShell {
    return this.lazy('shell', () => new AppShell(this.page));
  }

  get clients(): ClientsPage {
    return this.lazy('clients', () => new ClientsPage(this.page));
  }

  get workspace(): ClientWorkspace {
    return this.lazy('workspace', () => new ClientWorkspace(this.page));
  }

  get analyzeData(): AnalyzeDataPage {
    return this.lazy('analyzeData', () => new AnalyzeDataPage(this.page));
  }

  get behaviorSupport(): BehaviorSupportPage {
    return this.lazy('behaviorSupport', () => new BehaviorSupportPage(this.page));
  }

  /** Authenticated API client. Use `new ClinicalApi(this.api)` for negative cases. */
  get clinical(): ClinicalApi {
    return this.lazy('clinical', () => new ClinicalApi(this.api, this.auth.accessToken));
  }
}

setWorldConstructor(CustomWorld);
