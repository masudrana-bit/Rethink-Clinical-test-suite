/**
 * Opens the Cucumber HTML report in the default browser.
 *
 * Playwright ships `show-report` for its own report; the Cucumber one is a
 * plain file, so this is the equivalent convenience. Node built-ins only.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPORT = "cucumber-report/index.html";

if (!existsSync(REPORT)) {
  console.error(
    `No report at ${REPORT}. Run \`npm test\` first — the report is written on each run.`,
  );
  process.exit(1);
}

const path = resolve(REPORT);

const opener =
  process.platform === "win32"
    ? ["cmd", ["/c", "start", "", path]]
    : process.platform === "darwin"
      ? ["open", [path]]
      : ["xdg-open", [path]];

spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
console.log(`Opened ${REPORT}`);
