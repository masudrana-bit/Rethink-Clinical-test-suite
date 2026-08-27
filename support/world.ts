import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';

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
  data: TestData = {};

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);
