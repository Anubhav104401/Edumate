"""The HTML shell of the explainer: styles, the side menu, search and the light/dark switch."""

PAGE_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EduMate: Zero to Hero</title>
<meta name="description" content="A beginner's guide to every file and every line of the EduMate project.">
<style>
:root {
  --bg: #f6f7f9; --panel: #ffffff; --panel-2: #f1f4f8; --text: #1c2430; --muted: #5c6878; --line: #dde3ea;
  --accent: #1f4e79; --accent-soft: #e4eef8; --good: #1e7a46; --good-soft: #e3f4ea; --warn: #8a5a00;
  --warn-soft: #fdf1dc; --bad: #b42318; --bad-soft: #fde8e6; --auto: #f4f6f8; --cm: #f7f7f1;
  --code-bg: #fbfcfd; --kid: #f3ecff; --kid-line: #7c4dcc;
  --mono: "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace;
  --sans: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0e1319; --panel: #151c24; --panel-2: #1b242e; --text: #e2e8ef; --muted: #98a6b6; --line: #2a3542;
    --accent: #79b3e6; --accent-soft: #1b3044; --good: #6fd39a; --good-soft: #14301f; --warn: #e9b95a;
    --warn-soft: #362a10; --bad: #f1857b; --bad-soft: #3a1714; --auto: #18212a; --cm: #1a1f1a;
    --code-bg: #121920; --kid: #231a33; --kid-line: #b08cf0;
  }
}
:root[data-theme="dark"] {
  --bg: #0e1319; --panel: #151c24; --panel-2: #1b242e; --text: #e2e8ef; --muted: #98a6b6; --line: #2a3542;
  --accent: #79b3e6; --accent-soft: #1b3044; --good: #6fd39a; --good-soft: #14301f; --warn: #e9b95a;
  --warn-soft: #362a10; --bad: #f1857b; --bad-soft: #3a1714; --auto: #18212a; --cm: #1a1f1a;
  --code-bg: #121920; --kid: #231a33; --kid-line: #b08cf0;
}
* { box-sizing: border-box; }
html { scroll-padding-top: 70px; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 var(--sans); }
a { color: var(--accent); }
code, pre, kbd { font-family: var(--mono); font-size: 0.9em; }
:not(pre) > code { background: var(--panel-2); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
header.top { position: sticky; top: 0; z-index: 10; display: flex; gap: 12px; align-items: center;
  padding: 10px 18px; background: var(--panel); border-bottom: 1px solid var(--line); }
header.top .brand { font-weight: 700; color: var(--accent); white-space: nowrap; }
header.top input { flex: 1; max-width: 420px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--bg); color: var(--text); font: inherit; }
header.top button, .btn-row button { padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--panel-2); color: var(--text); font: inherit; cursor: pointer; }
.layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); }
nav.side { position: sticky; top: 53px; height: calc(100vh - 53px); overflow: auto; padding: 16px 12px 40px;
  border-right: 1px solid var(--line); background: var(--panel); font-size: 14px; }
nav.side ol { padding-left: 18px; margin: 0; }
nav.side li { margin: 3px 0; }
nav.side a { text-decoration: none; color: var(--text); }
nav.side a:hover { color: var(--accent); text-decoration: underline; }
main { padding: 24px 32px 80px; min-width: 0; }
section.chapter { max-width: 1180px; margin: 0 auto 56px; }
section.chapter > h1 { font-size: 30px; border-bottom: 3px solid var(--accent); padding-bottom: 8px; margin-top: 8px; }
h2 { font-size: 23px; margin-top: 36px; }
h3 { font-size: 18px; margin-top: 26px; }
h4 { font-size: 16px; margin-top: 18px; }
p, li { max-width: 78ch; }
table { border-collapse: collapse; }
.chapter table:not(.code) { width: 100%; margin: 12px 0 20px; font-size: 14.5px; background: var(--panel); }
.chapter table:not(.code) th, .chapter table:not(.code) td { border: 1px solid var(--line); padding: 7px 10px;
  text-align: left; vertical-align: top; }
.chapter table:not(.code) th { background: var(--panel-2); }
pre.block { background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px;
  overflow: auto; font-size: 13.5px; line-height: 1.5; }
.callout { border-left: 5px solid var(--accent); background: var(--accent-soft); padding: 10px 16px; margin: 16px 0;
  border-radius: 0 8px 8px 0; }
.callout.good { border-color: var(--good); background: var(--good-soft); }
.callout.warn { border-color: var(--warn); background: var(--warn-soft); }
.callout.bad { border-color: var(--bad); background: var(--bad-soft); }
.callout.kid { border-color: var(--kid-line); background: var(--kid); }
.callout > strong:first-child { display: block; margin-bottom: 4px; }
figure { margin: 20px 0; }
figure svg { width: 100%; height: auto; max-width: 1000px; display: block; }
figcaption { color: var(--muted); font-size: 14px; margin-top: 6px; }
.small { font-size: 13px; }
.muted { color: var(--muted); }
.nowrap { white-space: nowrap; }
.why { color: var(--muted); }
.note-box { background: var(--warn-soft); border: 1px solid var(--line); padding: 10px 14px; border-radius: 8px; }
/* ---------- the file-by-file reference ---------- */
details.file { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; margin: 10px 0; }
details.file > summary { cursor: pointer; padding: 10px 14px; display: flex; gap: 12px; align-items: baseline;
  flex-wrap: wrap; list-style: none; }
details.file > summary::-webkit-details-marker { display: none; }
details.file > summary::before { content: "▸"; color: var(--accent); }
details.file[open] > summary::before { content: "▾"; }
details.file .path { font-family: var(--mono); font-weight: 600; }
details.file .lines { color: var(--muted); font-size: 13px; }
details.file .ftitle { color: var(--muted); font-size: 14px; }
.fsummary { padding: 4px 18px 10px; border-top: 1px solid var(--line); }
table.code { width: 100%; table-layout: fixed; font-size: 13px; border-top: 1px solid var(--line); }
table.code td { vertical-align: top; border-bottom: 1px solid var(--line); }
table.code td.ln { width: 46px; text-align: right; padding: 1px 8px 1px 4px; color: var(--muted); font-family: var(--mono);
  background: var(--panel-2); user-select: none; }
table.code td.src { width: 52%; padding: 1px 10px; font-family: var(--mono); white-space: pre-wrap; word-break: break-word;
  background: var(--code-bg); border-right: 1px solid var(--line); line-height: 1.55; }
table.code td.ex { padding: 3px 12px; font-size: 13.5px; line-height: 1.5; background: var(--panel); }
table.code td.ex p { margin: 0 0 6px; }
table.code td.ex ul { margin: 2px 0 6px; padding-left: 18px; }
table.code td.ex.auto { background: var(--auto); color: var(--muted); }
table.code td.ex.cm { background: var(--cm); }
table.code td.ex.missing { background: var(--bad-soft); color: var(--bad); }
table.code tr:target td { outline: 2px solid var(--accent); outline-offset: -2px; }
table.catalogue { font-size: 13.5px; }
.hidden { display: none !important; }
details.file { overflow-x: auto; }
details.file .path, nav.side a, table.code td.src, table.code td.ex, .chapter td { overflow-wrap: anywhere; }
{{PYGMENTS_CSS}}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  nav.side { position: static; height: auto; max-height: 45vh; border-right: 0; border-bottom: 1px solid var(--line); }
  main { padding: 16px; }
  table.code td.src { width: 55%; }
  header.top { position: static; flex-wrap: wrap; gap: 8px; padding: 8px 16px; }
  html { scroll-padding-top: 8px; }
  header.top .brand { flex-basis: 100%; }
  header.top input { flex: 1 1 140px; min-width: 0; }
  .chapter table:not(.code) { display: block; overflow-x: auto; }
  section.chapter > h1 { font-size: 24px; }
}
@media print {
  header.top, nav.side { display: none; }
  .layout { display: block; }
  details.file { break-inside: auto; }
}
</style>
</head>
<body>
<header class="top">
  <span class="brand">EduMate · Zero to Hero</span>
  <input id="search" type="search" placeholder="Filter files by name (e.g. Payment, messages.ts)…" aria-label="Filter files">
  <button type="button" onclick="toggleAll(true)">Open all</button>
  <button type="button" onclick="toggleAll(false)">Close all</button>
  <button type="button" id="theme" aria-label="Switch light or dark">◐</button>
</header>
<div class="layout">
<nav class="side" aria-label="Contents">
<p class="small muted">Generated {{TODAY}} from the project's own source code.</p>
{{TOC}}
</nav>
<main>
{{BODY}}
</main>
</div>
<script>
function toggleAll(open) {
  document.querySelectorAll('details.file').forEach(function (d) {
    if (!d.classList.contains('hidden')) { d.open = open; }
  });
}
function openTarget() {
  var id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  var el = document.getElementById(id);
  if (!el) return;
  var d = el.closest('details');
  if (d) { d.open = true; }
  if (el.tagName === 'DETAILS') { el.open = true; }
  setTimeout(function () { el.scrollIntoView({ block: 'center' }); }, 30);
}
window.addEventListener('hashchange', openTarget);
window.addEventListener('DOMContentLoaded', openTarget);
document.getElementById('search').addEventListener('input', function (e) {
  var q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('details.file').forEach(function (d) {
    var name = d.querySelector('summary').textContent.toLowerCase();
    d.classList.toggle('hidden', q !== '' && name.indexOf(q) === -1);
  });
});
(function () {
  var root = document.documentElement;
  try { var saved = localStorage.getItem('edumate-explainer-theme'); if (saved) root.dataset.theme = saved; } catch (e) {}
  document.getElementById('theme').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('edumate-explainer-theme', root.dataset.theme); } catch (e) {}
  });
})();
</script>
</body>
</html>
"""
