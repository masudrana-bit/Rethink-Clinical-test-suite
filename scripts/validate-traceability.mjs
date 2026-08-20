#!/usr/bin/env node
/**
 * Validates an AIDLC traceability record.
 *
 * Two layers of checking:
 *   1. Structure, against aidlc-docs/schemas/traceability.schema.json.
 *   2. Referential integrity and rule compliance, which JSON Schema cannot express:
 *      cross-collection references, bidirectional coverage agreement, and the
 *      flaky-test rule of aidlc-e2e-rules.md section 25.
 *
 * Usage:
 *   node scripts/validate-traceability.mjs [recordPath] [--gate]
 *
 * Exit codes:
 *   0  record valid (and Gate G7 ready, when --gate is passed)
 *   1  record invalid, or not G7 ready under --gate
 *   2  could not run (missing schema, unreadable input)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "aidlc-docs/schemas/traceability.schema.json");
const defaultRecord = resolve(root, "aidlc-docs/traceability/traceability.json");

const args = process.argv.slice(2);
const gateMode = args.includes("--gate");
const positional = args.find((a) => !a.startsWith("--"));
const recordPath = positional ? resolve(positional) : defaultRecord;

const errors = [];
const gateIssues = [];
const rel = (p) => relative(root, p).replace(/\\/g, "/");

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`Cannot read ${label} at ${rel(path)}: ${e.message}`);
    process.exit(2);
  }
}

if (!existsSync(schemaPath)) {
  console.error(`Schema not found at ${rel(schemaPath)}`);
  process.exit(2);
}

if (!existsSync(recordPath)) {
  console.log(`No traceability record at ${rel(recordPath)}.`);
  console.log("Nothing to validate. A record is produced at workflow stage S10.");
  process.exit(0);
}

const schema = readJson(schemaPath, "schema");
const record = readJson(recordPath, "traceability record");

// ---------------------------------------------------------------- structure

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);

let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error(`Schema failed to compile: ${e.message}`);
  process.exit(2);
}

if (!validate(record)) {
  for (const e of validate.errors) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

// ------------------------------------------------------ referential checks

const requirements = record.requirements ?? [];
const testCases = record.testCases ?? [];
const bddScenarios = record.bddScenarios ?? [];
const automation = record.automation ?? [];
const executions = record.executions ?? [];
const blockers = record.blockers ?? [];

const requirementById = new Map(requirements.map((r) => [r.id, r]));
const testCaseById = new Map(testCases.map((t) => [t.id, t]));
const automationById = new Map(automation.map((a) => [a.id, a]));
const bddById = new Map(bddScenarios.map((b) => [b.id, b]));
const blockerIds = new Set(blockers.map((b) => b.id));

function checkDuplicates(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
}

checkDuplicates(requirements, "requirements");
checkDuplicates(testCases, "testCases");
checkDuplicates(bddScenarios, "bddScenarios");
checkDuplicates(automation, "automation");
checkDuplicates(executions, "executions");
checkDuplicates(blockers, "blockers");

// Acceptance criteria must reference test cases that exist, and the reference
// must be mutual: a criterion claiming coverage by a case the case does not
// claim back is a silent coverage overstatement.
for (const req of requirements) {
  const acIds = new Set();
  for (const ac of req.acceptanceCriteria ?? []) {
    if (acIds.has(ac.id)) errors.push(`${req.id}: duplicate acceptance criterion ${ac.id}`);
    acIds.add(ac.id);

    for (const tcId of ac.coveredBy ?? []) {
      const tc = testCaseById.get(tcId);
      if (!tc) {
        errors.push(`${req.id}/${ac.id}: coveredBy references unknown test case ${tcId}`);
        continue;
      }
      if (!(tc.acceptanceCriterionIds ?? []).includes(ac.id)) {
        errors.push(
          `${req.id}/${ac.id}: claims coverage by ${tcId}, but ${tcId} does not list ${ac.id}`
        );
      }
      if (tc.requirementId !== req.id) {
        errors.push(`${req.id}/${ac.id}: covered by ${tcId}, which belongs to ${tc.requirementId}`);
      }
    }
  }
}

for (const tc of testCases) {
  const req = requirementById.get(tc.requirementId);
  if (!req) {
    errors.push(`${tc.id}: references unknown requirement ${tc.requirementId}`);
  } else {
    if (req.approved !== true) {
      errors.push(`${tc.id}: requirement ${req.id} is not approved`);
    }
    const acIds = new Set((req.acceptanceCriteria ?? []).map((a) => a.id));
    for (const acId of tc.acceptanceCriterionIds ?? []) {
      if (!acIds.has(acId)) {
        errors.push(`${tc.id}: references unknown acceptance criterion ${acId} on ${req.id}`);
      }
    }
  }

  if (tc.bddScenarioId && !bddById.has(tc.bddScenarioId)) {
    errors.push(`${tc.id}: references unknown BDD scenario ${tc.bddScenarioId}`);
  }
  if (tc.supersededBy && !testCaseById.has(tc.supersededBy)) {
    errors.push(`${tc.id}: supersededBy references unknown test case ${tc.supersededBy}`);
  }
  for (const bId of tc.blockerIds ?? []) {
    if (!blockerIds.has(bId)) errors.push(`${tc.id}: references unknown blocker ${bId}`);
  }
}

for (const b of bddScenarios) {
  for (const tcId of b.testCaseIds ?? []) {
    if (!testCaseById.has(tcId)) {
      errors.push(`${b.id}: references unknown test case ${tcId}`);
    }
  }
}

for (const a of automation) {
  if (!testCaseById.has(a.testCaseId)) {
    errors.push(`${a.id}: references unknown test case ${a.testCaseId}`);
  }
}

for (const ex of executions) {
  if (!testCaseById.has(ex.testCaseId)) {
    errors.push(`${ex.id}: references unknown test case ${ex.testCaseId}`);
  }
  if (!requirementById.has(ex.requirementId)) {
    errors.push(`${ex.id}: references unknown requirement ${ex.requirementId}`);
  }
  if (ex.automationId && !automationById.has(ex.automationId)) {
    errors.push(`${ex.id}: references unknown automation entry ${ex.automationId}`);
  }
  const tc = testCaseById.get(ex.testCaseId);
  if (tc && requirementById.has(ex.requirementId) && tc.requirementId !== ex.requirementId) {
    errors.push(
      `${ex.id}: recorded against ${ex.requirementId}, but ${tc.id} belongs to ${tc.requirementId}`
    );
  }

  // aidlc-e2e-rules.md section 25: a test must not be rerun until it passes and
  // then reported as passed. Repeated attempts ending green need an investigation.
  if (ex.result === "PASSED" && (ex.runCount ?? 1) > 1 && !ex.flakyInvestigation) {
    errors.push(
      `${ex.id}: PASSED after ${ex.runCount} attempts with no flakyInvestigation recorded`
    );
  }
}

// ----------------------------------------------------------- G7 readiness

for (const req of requirements) {
  if (req.approved !== true) gateIssues.push(`${req.id}: requirement not approved`);
  for (const ac of req.acceptanceCriteria ?? []) {
    if (ac.coverage !== "COVERED") {
      gateIssues.push(`${req.id}/${ac.id}: coverage is ${ac.coverage}`);
    }
  }
}

for (const b of blockers) {
  if (b.blocking === true && !b.resolution) {
    gateIssues.push(`${b.id}: open blocking item (${b.token})`);
  }
}

const executedTestCases = new Set(executions.map((e) => e.testCaseId));
for (const tc of testCases) {
  if (tc.automationStatus !== "AUTOMATED") {
    gateIssues.push(`${tc.id}: automationStatus is ${tc.automationStatus}`);
  }
  if (!executedTestCases.has(tc.id)) {
    gateIssues.push(`${tc.id}: no execution recorded`);
  }
}

for (const ex of executions) {
  if (ex.result !== "PASSED") gateIssues.push(`${ex.id}: result is ${ex.result}`);
  if (ex.evidence && ex.evidence.phiReviewed !== true) {
    gateIssues.push(`${ex.id}: evidence not PHI-reviewed`);
  }
}

// ---------------------------------------------------------------- report

console.log(`Record:  ${rel(recordPath)}`);
console.log(`Schema:  ${rel(schemaPath)}`);
console.log(
  `Counts:  ${requirements.length} requirements, ${testCases.length} test cases, ` +
    `${bddScenarios.length} scenarios, ${automation.length} automation, ` +
    `${executions.length} executions, ${blockers.length} blockers`
);
console.log("");

if (errors.length) {
  console.log(`INVALID — ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors) console.log(`  - ${e}`);
} else {
  console.log("Structure and references: OK");
}

if (gateIssues.length) {
  console.log("");
  console.log(
    `Gate G7 not ready — ${gateIssues.length} outstanding item${gateIssues.length === 1 ? "" : "s"}:`
  );
  for (const g of gateIssues) console.log(`  - ${g}`);
  if (!gateMode) console.log("  (informational; pass --gate to fail the run on these)");
} else if (!errors.length) {
  console.log("Gate G7 readiness: OK");
}

if (errors.length || (gateMode && gateIssues.length)) process.exit(1);
process.exit(0);
