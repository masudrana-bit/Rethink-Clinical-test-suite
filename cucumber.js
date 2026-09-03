const common = {
  requireModule: ['ts-node/register'],
  require: ['support/**/*.ts', 'steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  strict: true,
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    'allure-cucumberjs/reporter:reports/allure-formatter.log',
    'summary',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    resultsDir: 'allure-results',
  },
};

// @wip marks features drafted during Inception whose unit has not been built yet.
// They stay in the repo as the specification for that bolt but never run by default.
//
// @bug marks scenarios that assert *correct* behaviour the app does not yet have.
// They are excluded from the default run so the suite stays green, and are expected
// to start passing when the defect is fixed. See docs/defects.md.
//
// @write mutates the dedicated TEST_CLIENT_ID client. Excluded from npm test until
// a write unit is signed off. Run with `npm run test:write`.
// @visual is a screenshot-diff gate (Unit 12). Host fonts/DPI make it a
// dedicated profile until Unit 14 CI pins the runner. Run with `npm run test:visual`.
// @a11y is included in npm test (D12: critical-only). Run alone with `npm run test:a11y`.
const ready = 'not @wip and not @bug and not @write and not @visual';

module.exports = {
  default: { ...common, tags: ready },
  preflight: { ...common, tags: `@preflight and ${ready}` },
  smoke: { ...common, tags: `@smoke and ${ready}` },
  api: { ...common, tags: `@api and ${ready}` },
  endpoints: {
    ...common,
    tags:
      '(@api and not @bug and not @write and not @wip) or ' +
      '(@api and @behavior-support and @bug)',
  },
  ui: { ...common, tags: `@ui and ${ready}` },
  wip: { ...common, tags: '@wip' },
  bugs: { ...common, tags: '@bug and not @wip' },
  write: { ...common, tags: '@write and not @wip and not @bug' },
  visual: { ...common, tags: '@visual and not @wip and not @bug' },
  a11y: { ...common, tags: '@a11y and not @wip and not @bug' },
  sessions: { ...common, tags: '@sessions and not @wip and not @bug' },
};
