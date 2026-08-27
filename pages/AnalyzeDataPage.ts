import { Locator, Page, expect } from '@playwright/test';
import { PrimeSelect } from './PrimeSelect';

export type SummaryTile = 'mastered' | 'in-scope' | 'remaining';

export type AnalyzeMode = 'mastered' | 'custom' | 'bulk';

/** The chart is Highcharts SVG, not a canvas, despite the testid's name. */
export type Grouping = 'Domain' | 'Category' | 'Area';

/** Date-range chips. The "all" chip uses a different testid suffix to the day chips. */
export const DATE_WINDOWS = {
  '2 weeks': 'report-window-days:14',
  '1 month': 'report-window-days:30',
  '3 months': 'report-window-days:90',
  '6 months': 'report-window-days:180',
  All: 'report-window-all',
} as const;

export type DateWindow = keyof typeof DATE_WINDOWS;

/** /clients/:id/analyze-data */
export class AnalyzeDataPage {
  readonly root: Locator;
  readonly reportControls: Locator;
  readonly scopeSelect: Locator;
  readonly groupingSelect: Locator;
  readonly summary: Locator;
  readonly chart: Locator;
  readonly chartCanvas: Locator;
  readonly masteryReview: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('analyze-data-page');
    this.reportControls = page.getByTestId('report-controls');
    this.scopeSelect = page.getByTestId('report-scope-select');
    this.groupingSelect = page.getByTestId('mastered-grouping-select');
    this.summary = page.getByTestId('mastered-targets-summary');
    this.chart = page.getByTestId('mastered-report-chart');
    this.chartCanvas = page.getByTestId('clinical-chart-canvas');
    this.masteryReview = page.getByTestId('mastery-evaluation-review');
  }

  tile(which: SummaryTile): Locator {
    return this.page.getByTestId(`mastered-tile-${which}`);
  }

  dateWindow(window: DateWindow): Locator {
    return this.page.getByTestId(DATE_WINDOWS[window]);
  }

  mode(which: 'mastered' | 'custom' | 'bulk'): Locator {
    return this.page.getByTestId(`analyze-mode-${which}`);
  }

  async goto(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}/analyze-data`);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.summary).toBeVisible();
    // Tiles hold "--" until the report resolves; wait for real figures rather
    // than letting every downstream assertion race the load.
    await expect(this.tile('in-scope'), 'the in-scope tile should resolve to a number').toHaveText(
      /\d/,
      { timeout: 30_000 },
    );
  }

  /**
   * Tiles render a label and a number in one node. Pull the first integer out
   * rather than parsing the whole string.
   */
  async tileValue(which: SummaryTile): Promise<number> {
    const text = (await this.tile(which).innerText()).replace(/,/g, '');
    const match = /-?\d+/.exec(text);
    if (!match) {
      throw new Error(`Tile "${which}" contained no number. Text was: ${JSON.stringify(text)}`);
    }
    return Number(match[0]);
  }

  /**
   * The summary reports "across N skill areas". The caption sits alongside the
   * tile rather than inside it, so read the whole summary block.
   */
  async skillAreaCount(): Promise<number> {
    const text = await this.summary.innerText();
    const match = /across\s+(\d+)\s+skill area/i.exec(text);
    if (!match) {
      throw new Error(`The summary did not report a skill-area count. Text: ${text}`);
    }
    return Number(match[1]);
  }

  // --- Chart -------------------------------------------------------------

  get chartSvg(): Locator {
    return this.chartCanvas.locator('svg').first();
  }

  /** `allInnerTexts` yields undefined for SVG `<text>`; read textContent instead. */
  async chartCategories(): Promise<string[]> {
    const labels = await this.chartCanvas
      .locator('.highcharts-xaxis-labels text')
      .allTextContents();
    return labels.map((label) => (label ?? '').trim()).filter(Boolean).sort();
  }

  async chartAxisTickCount(): Promise<number> {
    return this.chartCanvas.locator('.highcharts-yaxis-labels text').count();
  }

  async selectGrouping(grouping: Grouping): Promise<void> {
    await new PrimeSelect(this.page, this.groupingSelect, 'grouping select').choose(grouping);
  }

  // --- Date window -------------------------------------------------------

  async chooseWindow(window: DateWindow): Promise<void> {
    await this.dateWindow(window).click();
  }

  async activeWindows(): Promise<DateWindow[]> {
    const active: DateWindow[] = [];
    for (const name of Object.keys(DATE_WINDOWS) as DateWindow[]) {
      if ((await this.dateWindow(name).getAttribute('aria-pressed')) === 'true') {
        active.push(name);
      }
    }
    return active;
  }

  // --- Modes -------------------------------------------------------------

  async setMode(which: AnalyzeMode): Promise<void> {
    await this.mode(which).click();
  }

  async activeModes(): Promise<AnalyzeMode[]> {
    const active: AnalyzeMode[] = [];
    for (const name of ['mastered', 'custom', 'bulk'] as AnalyzeMode[]) {
      if ((await this.mode(name).getAttribute('aria-pressed')) === 'true') active.push(name);
    }
    return active;
  }

  get masteredReport(): Locator {
    return this.page.getByTestId('mastered-targets-report');
  }

  get customGraph(): Locator {
    return this.page.getByTestId('custom-comparison-graph');
  }

  get bulkReport(): Locator {
    return this.page.getByTestId('bulk-graph-report');
  }

  /** "N available in this scope" on the Custom Graph and Bulk Graphs modes. */
  async seriesCount(): Promise<number> {
    const text = await this.page.getByTestId('report-series-count').innerText();
    const match = /(\d+)/.exec(text.replace(/,/g, ''));
    if (!match) throw new Error(`Series count had no number. Text: ${text}`);
    return Number(match[1]);
  }

  // --- Pending mastery determinations -------------------------------------

  get reviewRows(): Locator {
    return this.page.getByTestId('mastery-review-row');
  }

  get reviewGroupHeadings(): Locator {
    return this.page.getByTestId('mastery-review-group-heading');
  }

  /** Each group heading, paired with the program named on every row beneath it. */
  async reviewGroups(): Promise<Array<{ heading: string; programs: string[] }>> {
    return this.masteryReview.evaluate((root) => {
      const groups: Array<{ heading: string; programs: string[] }> = [];
      for (const node of Array.from(root.querySelectorAll('[data-testid]'))) {
        const id = node.getAttribute('data-testid');
        if (id === 'mastery-review-group-heading') {
          groups.push({ heading: (node.textContent ?? '').trim(), programs: [] });
        } else if (id === 'mastery-review-row' && groups.length) {
          const program = node.querySelector('[data-testid="mastery-review-program"]');
          groups[groups.length - 1].programs.push((program?.textContent ?? '').trim());
        }
      }
      return groups;
    });
  }
}
