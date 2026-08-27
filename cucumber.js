const common = {
  requireModule: ['ts-node/register'],
  require: ['support/**/*.ts', 'steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  format: ['progress-bar', 'html:reports/cucumber-report.html', 'summary'],
  formatOptions: { snippetInterface: 'async-await' },
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
const ready = 'not @wip and not @bug and not @write';

module.exports = {
  default: { ...common, tags: ready },
  preflight: { ...common, tags: `@preflight and ${ready}` },
  smoke: { ...common, tags: `@smoke and ${ready}` },
  api: { ...common, tags: `@api and ${ready}` },
  ui: { ...common, tags: `@ui and ${ready}` },
  wip: { ...common, tags: '@wip' },
  bugs: { ...common, tags: '@bug and not @wip' },
  write: { ...common, tags: '@write and not @wip and not @bug' },
};
