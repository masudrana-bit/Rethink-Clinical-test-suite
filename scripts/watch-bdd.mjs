/**
 * Regenerates the BDD tests whenever a feature file or step definition changes,
 * so `bddgen` never has to be run by hand.
 *
 * playwright-bdd compiles Gherkin into Playwright tests as a separate step
 * rather than reading .feature files at run time. That is deliberate on its
 * part: the Playwright config is loaded repeatedly by workers, the VS Code
 * extension, and UI mode, and generating on the fly caused both redundant work
 * and a watch loop, where regenerating a test file triggered the run that
 * regenerated it again. Decoupling the two is the maintainer's answer to that.
 *
 * The compile step is therefore not removable, but it is hidden. `npm test`
 * runs it, and this script runs it on save.
 *
 * Pass --ui to also start Playwright UI mode as a child process, giving a
 * single command for the edit-save-rerun loop.
 *
 * Uses only Node built-ins, so watching costs the project no dependencies.
 */

import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { extname } from "node:path";

const WATCHED_DIRS = ["features", "src/steps", "src/fixtures"];
const WATCHED_EXTENSIONS = new Set([".feature", ".ts"]);
const DEBOUNCE_MS = 200;

const withUi = process.argv.includes("--ui");

/** Serialises regeneration: a save during a run queues one more, not a pile. */
let running = false;
let queued = false;
let debounce;

function runBddgen() {
  if (running) {
    queued = true;
    return;
  }

  running = true;
  const started = Date.now();

  const child = spawn("npx bddgen", { shell: true, stdio: "inherit" });

  child.on("exit", (code) => {
    running = false;

    const outcome =
      code === 0
        ? `regenerated in ${Date.now() - started}ms`
        : `FAILED (exit ${code}) — a step probably no longer matches its Gherkin`;
    console.log(`[watch-bdd] ${outcome}`);

    if (queued) {
      queued = false;
      runBddgen();
    }
  });
}

function onChange(filename) {
  if (!filename || !WATCHED_EXTENSIONS.has(extname(filename))) return;

  clearTimeout(debounce);
  debounce = setTimeout(runBddgen, DEBOUNCE_MS);
}

for (const dir of WATCHED_DIRS) {
  if (!existsSync(dir)) {
    console.warn(`[watch-bdd] skipping ${dir} — not found`);
    continue;
  }

  watch(dir, { recursive: true }, (_event, filename) => onChange(filename));
  console.log(`[watch-bdd] watching ${dir}`);
}

runBddgen();

if (withUi) {
  const ui = spawn("npx playwright test --ui", { shell: true, stdio: "inherit" });
  ui.on("exit", (code) => process.exit(code ?? 0));
}
