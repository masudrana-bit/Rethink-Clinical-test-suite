import * as fs from 'node:fs';
import * as path from 'node:path';
import { Locator, Page, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { config } from './config';

/** Locked for every `@visual` context so baselines do not shift with the host display. */
export const VISUAL_VIEWPORT = { width: 1280, height: 720 } as const;

const BASELINE_DIR = path.join('visual', 'baselines');
const DIFF_DIR = path.join('reports', 'visual');

/** Names, roles, and the current client — they change independently of layout (D9 / D11). */
export function chromeVolatile(page: Page): Locator[] {
  return [
    page.getByTestId('user-menu-name'),
    page.getByTestId('user-menu-role'),
    page.getByTestId('client-switcher-select'),
  ];
}

function pngFrom(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

/**
 * Viewport screenshot with magenta masks over volatile locators, compared to a
 * committed PNG under `visual/baselines`. Set `UPDATE_VISUAL=1` to rewrite a
 * baseline (and to create the first one).
 */
export async function assertMatchesBaseline(
  page: Page,
  name: string,
  mask: Locator[],
): Promise<void> {
  expect(name, 'baseline names are filesystem-safe').toMatch(/^[a-z0-9-]+$/);

  await page.evaluate(() => document.fonts.ready);

  const actualBuf = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    mask,
    maskColor: '#FF00FF',
    scale: 'css',
  });

  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);
  const update = config.updateVisual;

  if (update || !fs.existsSync(baselinePath)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
    fs.writeFileSync(baselinePath, actualBuf);
    if (update) return;
    throw new Error(
      `No visual baseline for "${name}". Wrote ${baselinePath}. ` +
        'Re-run with UPDATE_VISUAL=1 to accept it, then commit the PNG.',
    );
  }

  const expected = pngFrom(fs.readFileSync(baselinePath));
  const actual = pngFrom(actualBuf);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIFF_DIR, `${name}-actual.png`), actualBuf);
    throw new Error(
      `Visual "${name}" size ${actual.width}x${actual.height} does not match ` +
        `baseline ${expected.width}x${expected.height}. Diff written under ${DIFF_DIR}.`,
    );
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  const mismatched = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    { threshold: 0.1 },
  );
  const total = expected.width * expected.height;
  const ratio = mismatched / total;
  const maxRatio = 0.02;

  if (ratio > maxRatio) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIFF_DIR, `${name}-actual.png`), actualBuf);
    fs.writeFileSync(path.join(DIFF_DIR, `${name}-diff.png`), PNG.sync.write(diff));
    throw new Error(
      `Visual "${name}" differed by ${(ratio * 100).toFixed(2)}% of pixels ` +
        `(${mismatched}/${total}; max ${(maxRatio * 100).toFixed(0)}%). ` +
        `See ${DIFF_DIR}/${name}-diff.png.`,
    );
  }
}
