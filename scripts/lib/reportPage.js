#!/usr/bin/env node
/**
 * Shared chrome for the published report pages: one stylesheet, one nav, one
 * set of status badges. Pages are self-contained (inline CSS, no scripts, no
 * external assets) so they open from a file:// path or any static host, which
 * is the same constraint the dashboard already works under.
 */

const NAV = [
  { href: 'index.html', label: 'Overview' },
  { href: 'coverage.html', label: 'Coverage' },
  { href: 'traceability.html', label: 'Traceability' },
  { href: 'gates.html', label: 'Blockers' },
  { href: 'endpoints.html', label: 'Endpoints' },
  { href: 'allure/index.html', label: 'Evidence' },
];

/** Plain-language names. Nothing on these pages names a tag or a feature file. */
const STATUS_LABELS = {
  // curated inventory statuses
  covered: 'Covered',
  bug: 'Defect open',
  partial: 'Partly covered',
  wip: 'Blocked',
  gap: 'Not covered',
  excluded: 'Out of scope',
  // computed statuses
  proven: 'Proven this run',
  failed: 'Failing',
  blocked: 'Blocked by an outage',
  'known-defect': 'Failing as documented',
  unproven: 'Not proven this run',
  filtered: 'Held back on purpose',
  'not-run': 'Not run',
  unscripted: 'No scenario',
  undocumented: 'No automation recorded',
  process: 'CI mechanism',
  unmapped: 'No case cited',
  passed: 'Passed',
  // agreement
  agrees: 'Agrees',
  conflict: 'Contradicted',
  understated: 'Understated',
  'fix-detected': 'Fix detected',
  acknowledged: 'Acknowledged',
  'out-of-scope': 'Out of scope',
};

/** good = reassuring, bad = needs action, warn = explained but unproven. */
const STATUS_TONE = {
  covered: 'good',
  proven: 'good',
  passed: 'good',
  agrees: 'good',
  clear: 'good',
  bug: 'warn',
  partial: 'warn',
  blocked: 'warn',
  unproven: 'warn',
  filtered: 'idle',
  'known-defect': 'idle',
  'not-run': 'idle',
  process: 'idle',
  excluded: 'idle',
  'out-of-scope': 'idle',
  understated: 'warn',
  'fix-detected': 'warn',
  acknowledged: 'warn',
  wip: 'warn',
  gap: 'bad',
  failed: 'bad',
  conflict: 'bad',
  unmapped: 'bad',
  unscripted: 'bad',
  undocumented: 'bad',
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

function badge(status) {
  const tone = STATUS_TONE[status] ?? 'idle';
  return `<span class="pill ${tone}">${esc(statusLabel(status))}</span>`;
}

function kpi(value, label, note, tone = '') {
  return `<div class="kpi"><div class="v ${tone}">${esc(value)}</div><div class="l">${esc(label)}</div>${
    note ? `<div class="n">${esc(note)}</div>` : ''
  }</div>`;
}

function nav(current) {
  const links = NAV.map((entry) =>
    entry.href === current
      ? `<span class="navlink here">${esc(entry.label)}</span>`
      : `<a class="navlink" href="${entry.href}">${esc(entry.label)}</a>`,
  ).join('');
  return `<nav class="sitenav">${links}</nav>`;
}

const STYLE = `
  :root {
    color-scheme: light;
    --ink: #101c2c; --body: #3d4b5c; --soft: #6b7a8d; --hair: #e3e8ef;
    --pass: #17708f; --good: #1a7f4b; --bad: #b3261e; --warn: #a86a00; --idle: #8a97a6;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 24px 56px;
         font: 15px/1.6 "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
         color: var(--body); background: #eef1f5; }
  main { max-width: 1180px; margin: 0 auto; }
  .sitenav { display: flex; flex-wrap: wrap; gap: 4px; max-width: 1180px; margin: 0 auto 20px;
             background: #fff; border: 1px solid var(--hair); border-radius: 10px; padding: 6px; }
  .navlink { padding: 7px 14px; border-radius: 7px; font-size: 13.5px; font-weight: 600;
             text-decoration: none; color: var(--soft); }
  .navlink:hover { background: #f3f6f9; color: var(--ink); }
  .navlink.here { background: var(--ink); color: #fff; }
  .topbar { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end;
            justify-content: space-between; padding: 0 4px 20px; }
  .eyebrow { margin: 0; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--soft); }
  h1 { margin: 2px 0 0; font-size: 26px; font-weight: 650; color: var(--ink); letter-spacing: -.01em; }
  .runmeta { display: flex; flex-wrap: wrap; gap: 0 28px; margin: 0; }
  .runmeta div { text-align: right; }
  .runmeta dt { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
  .runmeta dd { margin: 2px 0 0; font-size: 14px; color: var(--ink); font-weight: 600; }
  section { background: #fff; border: 1px solid var(--hair); border-radius: 10px;
            padding: 24px 28px; margin-bottom: 18px; box-shadow: 0 1px 2px rgba(16,28,44,.04); }
  h2 { font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
       color: var(--soft); margin: 0 0 18px; }
  h3 { font-size: 15px; font-weight: 650; color: var(--ink); margin: 22px 0 10px; }
  .lede { margin: 0 0 18px; font-size: 15.5px; color: var(--ink); max-width: 62em; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1px;
          background: var(--hair); border: 1px solid var(--hair); border-radius: 8px; overflow: hidden; }
  .kpi { background: #fff; padding: 16px 18px; }
  .kpi .v { font-size: 30px; font-weight: 650; color: var(--ink); line-height: 1.15; }
  .kpi .v.bad { color: var(--bad); } .kpi .v.good { color: var(--good); } .kpi .v.warn { color: var(--warn); }
  .kpi .l { font-size: 13px; font-weight: 600; color: var(--ink); margin-top: 2px; }
  .kpi .n { font-size: 12.5px; color: var(--soft); }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--hair); vertical-align: top; }
  thead th { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--soft);
             border-bottom: 1px solid #cdd5df; padding-bottom: 8px; }
  tbody tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.id { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12.5px; color: var(--ink); white-space: nowrap; }
  td.strong { font-weight: 600; color: var(--ink); }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 700;
          letter-spacing: .02em; white-space: nowrap; }
  .pill.good { background: #e6f4ec; color: var(--good); }
  .pill.bad { background: #fbeae9; color: var(--bad); }
  .pill.warn { background: #fdf6e6; color: var(--warn); }
  .pill.idle { background: #f0f3f7; color: var(--idle); }
  .chip { display: inline-block; min-width: 24px; text-align: center; padding: 1px 7px; margin-right: 8px;
          border-radius: 3px; font-size: 11px; font-weight: 700; }
  .chip.P0, .chip.P1 { background: #fbeae9; color: var(--bad); }
  .chip.P2 { background: #fdf6e6; color: var(--warn); }
  .chip.P3 { background: #f0f3f7; color: var(--soft); }
  .callout { background: #fdf6e6; border: 1px solid #ecd9a8; border-left: 3px solid var(--warn);
             border-radius: 6px; padding: 12px 14px; margin: 0 0 16px; color: #6b4d09; }
  .warnbox { background: #fbeae9; border: 1px solid #f0c4c1; border-left: 3px solid var(--bad);
             border-radius: 6px; padding: 12px 14px; margin: 0 0 16px; color: #7d1a15; }
  .okbox { background: #e9f5ee; border: 1px solid #bfe0cc; border-left: 3px solid var(--good);
           border-radius: 6px; padding: 12px 14px; margin: 0 0 16px; color: #145c37; }
  .note { font-size: 13px; color: var(--soft); margin: 12px 0 0; }
  .muted { color: var(--soft); }
  .stack { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin: 4px 0 16px; }
  .seg { height: 100%; }
  .seg.good { background: var(--good); } .seg.warn { background: #d98324; }
  .seg.bad { background: var(--bad); } .seg.idle { background: #ccd4dd; }
  ul.plain { margin: 0; padding: 0; list-style: none; }
  ul.plain li { padding: 7px 0; border-bottom: 1px solid var(--hair); font-size: 14px; }
  ul.plain li:last-child { border-bottom: none; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12.5px;
         background: #f3f6f9; padding: 1px 5px; border-radius: 3px; }
  footer { font-size: 12.5px; color: var(--soft); padding: 4px 4px 0;
           display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
  a { color: var(--pass); }
  .md h2 { font-size: 18px; text-transform: none; letter-spacing: 0; color: var(--ink); margin: 26px 0 12px; }
  .md h3 { font-size: 15px; }
  .md table { margin-bottom: 18px; }
  @media (max-width: 720px) { .runmeta div { text-align: left; } }
`;

/** Wraps page content in the standard shell. */
function page({ title, eyebrow, heading, meta = [], current, body, footer = '' }) {
  const metaHtml = meta
    .map((entry) => `<div><dt>${esc(entry.label)}</dt><dd>${esc(entry.value)}</dd></div>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${nav(current)}
<main>
<header class="topbar">
  <div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(heading)}</h1></div>
  <dl class="runmeta">${metaHtml}</dl>
</header>
${body}
<footer><span>${footer || 'Regenerated from the latest run. Nothing on this page is hand-maintained.'}</span><span>Detailed evidence: <a href="allure/index.html">Allure</a></span></footer>
</main>
</body>
</html>
`;
}

/**
 * Just enough Markdown for the reports we publish: headings, tables, lists,
 * paragraphs, and inline code/bold/links. Pulling in a parser for four
 * generated documents would not earn its dependency.
 */
function markdownToHtml(markdown) {
  const inline = (text) =>
    esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const lines = markdown.split(/\r?\n/);
  const out = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length + 1, 4);
      out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    // A table is a header row followed by a separator row of dashes.
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1] ?? '')) {
      const cells = (row) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
      const header = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      out.push(
        `<table><thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(`<li>${inline(lines[index].replace(/^\s*[-*]\s+/, ''))}</li>`);
        index += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (line.trim() === '' || /^-{3,}$/.test(line.trim())) {
      index += 1;
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !/^\s*[|#-]/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    else index += 1;
  }
  return out.join('\n');
}

module.exports = { page, nav, esc, badge, kpi, statusLabel, markdownToHtml, STATUS_LABELS, STATUS_TONE };
