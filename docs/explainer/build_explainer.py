#!/usr/bin/env python3
"""
Builds docs/EduMate-Zero-to-Hero.html: the beginner's guide to every file and line of EduMate.

How it works
------------
1. It lists every file in the git repository (the explainer's own folder is left out).
2. It syntax-colours each file with Pygments.
3. Each line gets an explanation, in this order of preference:
     a. a hand-written note from docs/explainer/notes/*.txt, or
     b. an automatic explanation for repetitive lines (imports, comments, closing brackets,
        getters/setters, SQL columns, CSS properties, YAML settings, text-catalogue entries ...).
4. It checks coverage: every non-blank line must be explained. Run with --strict to fail the build
   (exit code 1) and list the uncovered lines.
5. It adds the hand-written chapters from docs/explainer/chapters/*.html in front, and writes one
   self-contained HTML file (no internet needed to read it).

Usage:  python docs/explainer/build_explainer.py [--strict] [--report]
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from pygments import lex
from pygments.lexers import get_lexer_by_name
from pygments.token import STANDARD_TYPES, Token

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vocabulary as V  # noqa: E402  (dictionaries of explanations)

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
NOTES_DIR = HERE / "notes"
CHAPTERS_DIR = HERE / "chapters"
OUT = ROOT / "docs" / "EduMate-Zero-to-Hero.html"

SUMMARY_ONLY = {"frontend/package-lock.json", "backend/mvnw", "backend/mvnw.cmd"}
EXCLUDED_PREFIXES = ("docs/", "screenshots/")


def esc(text: str) -> str:
    return html.escape(text, quote=False)


# =====================================================================
#  Files
# =====================================================================
def repo_files() -> list[str]:
    out = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    files = [f for f in out.splitlines() if f and not f.startswith(EXCLUDED_PREFIXES)]
    return sorted(set(files), key=file_order)


GROUP_ORDER = [
    ("", "Project root"),
    ("scripts/", "Helper scripts"),
    ("backend/", "Backend: build and configuration files"),
    ("backend/src/main/resources/", "Backend: settings and database schema"),
    ("backend/src/main/java/com/edumate/", "Backend: Java source code"),
    ("backend/src/test/java/com/edumate/", "Backend: automated tests"),
    ("frontend/", "Frontend: build and configuration files"),
    ("frontend/src/", "Frontend: TypeScript / React source code"),
]

JAVA_PACKAGE_ORDER = ["", "config/", "common/", "campus/", "security/", "academic/", "attendance/", "exam/",
                      "fees/", "admissions/", "documents/", "consent/", "timetable/", "library/",
                      "notifications/", "dashboard/", "admin/"]
FRONT_ORDER = ["main.tsx", "App.tsx", "config.ts", "navigation", "i18n/", "styles/", "theme/", "api/", "auth/",
               "hooks/", "motion/", "components/", "utils/", "pages/"]


def group_of(path: str) -> str:
    best = ""
    for prefix, _ in GROUP_ORDER:
        if prefix and path.startswith(prefix) and len(prefix) > len(best):
            best = prefix
    if best == "frontend/" and path.startswith("frontend/public/"):
        return "frontend/"
    return best


def file_order(path: str):
    group = group_of(path)
    gi = [p for p, _ in GROUP_ORDER].index(group)
    sub = path[len(group):]
    if group == "backend/src/main/java/com/edumate/":
        pkg = sub.rsplit("/", 1)[0] + "/" if "/" in sub else ""
        pi = JAVA_PACKAGE_ORDER.index(pkg) if pkg in JAVA_PACKAGE_ORDER else 99
        return (gi, pi, sub)
    if group == "frontend/src/":
        for i, p in enumerate(FRONT_ORDER):
            if sub.startswith(p):
                return (gi, i, sub)
        return (gi, 50, sub)
    return (gi, 0, sub)


def anchor(path: str) -> str:
    return "f-" + re.sub(r"[^A-Za-z0-9]+", "-", path).strip("-")


# =====================================================================
#  Notes
# =====================================================================
@dataclass
class Block:
    start: int
    end: int
    html: str
    auto: bool = False
    kind: str = ""


@dataclass
class FileNotes:
    summary: str = ""
    blocks: list[Block] = field(default_factory=list)


INLINE_CODE = re.compile(r"`([^`]+)`")
BOLD = re.compile(r"\*\*(.+?)\*\*")


def md(text: str) -> str:
    """A tiny markdown: paragraphs, '- ' bullet lists, `code`, **bold**. HTML tags pass through."""
    text = text.strip("\n")
    if not text.strip():
        return ""
    placeholders: list[str] = []

    def keep(m):
        placeholders.append("<code>" + esc(m.group(1)) + "</code>")
        return f"\u0000{len(placeholders) - 1}\u0000"

    def keep_pre(m):
        placeholders.append('<pre class="block">' + esc(m.group(1).strip("\n")) + "</pre>")
        return f"\n\n\u0000{len(placeholders) - 1}\u0000\n\n"

    text = re.sub(r'<pre class="block">(.*?)</pre>', keep_pre, text, flags=re.S)
    text = INLINE_CODE.sub(keep, text)
    text = BOLD.sub(r"<strong>\1</strong>", text)
    out, para, items = [], [], []

    def flush_para():
        if para:
            out.append("<p>" + " ".join(para) + "</p>")
            para.clear()

    def flush_items():
        if items:
            out.append("<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>")
            items.clear()

    table: list[list[str]] = []

    def flush_table():
        if not table:
            return
        rows = [r for r in table if not all(set(c.strip()) <= set("-: ") for c in r)]
        head, body = rows[0], rows[1:]
        out.append('<table class="catalogue"><thead><tr>' + "".join(f"<th>{c.strip()}</th>" for c in head)
                   + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c.strip()}</td>" for c in r) + "</tr>"
                                                       for r in body) + "</tbody></table>")
        table.clear()

    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            flush_para()
            flush_items()
            table.append(stripped[1:-1].split("|"))
            continue
        flush_table()
        if not stripped:
            flush_para()
            flush_items()
        elif stripped.startswith("- "):
            flush_para()
            items.append(stripped[2:])
        elif items and line.startswith("  "):
            items[-1] += " " + stripped
        else:
            flush_items()
            para.append(stripped)
    flush_para()
    flush_items()
    flush_table()
    result = "".join(out)
    result = re.sub("<p>\u0000(\\d+)\u0000</p>", "\u0000\\1\u0000", result)
    return re.sub("\u0000(\\d+)\u0000", lambda m: placeholders[int(m.group(1))], result)


def load_notes() -> dict[str, FileNotes]:
    notes: dict[str, FileNotes] = {}
    for note_file in sorted(NOTES_DIR.glob("*.txt")):
        current: FileNotes | None = None
        target = None
        buffer: list[str] = []

        def commit():
            if current is None or target is None:
                return
            body = "\n".join(buffer)
            if target == "SUMMARY":
                current.summary = md(body)
            else:
                for part in target.split(","):
                    part = part.strip()
                    a, _, b = part.partition("-")
                    current.blocks.append(Block(int(a), int(b or a), md(body)))

        for raw in note_file.read_text(encoding="utf-8").splitlines():
            if raw.startswith("=== FILE "):
                commit()
                path = raw[len("=== FILE "):].strip()
                current = notes.setdefault(path, FileNotes())
                target, buffer = None, []
            elif raw.startswith(">>> "):
                commit()
                target, buffer = raw[4:].strip(), []
            else:
                buffer.append(raw)
        commit()
    return notes


# =====================================================================
#  Syntax colouring
# =====================================================================
LEXERS = {
    ".java": "java", ".ts": "typescript", ".tsx": "tsx", ".css": "css", ".sql": "sql", ".yml": "yaml",
    ".yaml": "yaml", ".json": "json", ".xml": "xml", ".html": "html", ".svg": "xml", ".md": "markdown",
    ".ps1": "powershell", ".conf": "nginx", ".cmd": "batch", ".properties": "properties", ".js": "javascript",
}


def lexer_for(path: str):
    name = Path(path).name
    if name == "Dockerfile":
        return get_lexer_by_name("docker")
    if name in (".gitignore", ".gitattributes", ".env.example"):
        return get_lexer_by_name("bash")
    if name == "mvnw":
        return get_lexer_by_name("bash")
    suffix = Path(path).suffix
    return get_lexer_by_name(LEXERS.get(suffix, "text"))


def css_class(ttype) -> str:
    while ttype not in STANDARD_TYPES and ttype.parent is not None:
        ttype = ttype.parent
    return STANDARD_TYPES.get(ttype, "")


def highlight(path: str, text: str) -> list[str]:
    lines: list[list[str]] = [[]]
    for ttype, value in lex(text, lexer_for(path)):
        cls = css_class(ttype)
        for i, piece in enumerate(value.split("\n")):
            if i > 0:
                lines.append([])
            if piece:
                lines[-1].append(f'<span class="{cls}">{esc(piece)}</span>' if cls else esc(piece))
    count = len(text.split("\n"))
    rendered = ["".join(parts) for parts in lines][:count]
    while len(rendered) < count:
        rendered.append("")
    return rendered


# =====================================================================
#  Automatic explanations
# =====================================================================
def comment_kind(path: str) -> str:
    suffix = Path(path).suffix
    name = Path(path).name
    if suffix in (".java", ".ts", ".tsx", ".css", ".js"):
        return "c"
    if suffix in (".yml", ".yaml", ".ps1", ".conf") or name in ("Dockerfile", ".gitignore", ".gitattributes",
                                                                ".env.example"):
        return "hash"
    if suffix == ".sql":
        return "sql"
    if suffix in (".xml", ".html", ".svg"):
        return "xml"
    return ""


def comment_lines(path: str, lines: list[str]) -> set[int]:
    """Line numbers (1-based) that contain only a comment."""
    kind = comment_kind(path)
    result: set[int] = set()
    in_block = False
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if kind == "c":
            if in_block:
                result.add(i)
                if "*/" in s:
                    in_block = False
                continue
            if s.startswith("//"):
                result.add(i)
            elif s.startswith("/*"):
                result.add(i)
                if "*/" not in s[2:]:
                    in_block = True
            elif s.startswith("{/*") and s.endswith("*/}"):
                result.add(i)
            elif s.startswith("{/*"):
                result.add(i)
                in_block = True
        elif kind == "hash":
            if s.startswith("#") and not s.startswith("#!"):
                result.add(i)
        elif kind == "sql":
            if s.startswith("--"):
                result.add(i)
        elif kind == "xml":
            if in_block:
                result.add(i)
                if "-->" in s:
                    in_block = False
                continue
            if s.startswith("<!--"):
                result.add(i)
                if "-->" not in s:
                    in_block = True
    return result


def comment_text(line: str) -> str:
    s = line.strip()
    for prefix in ("{/*", "/**", "/*", "//", "*/", "*", "<!--", "--", "#"):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    for suffix in ("*/}", "*/", "-->"):
        if s.endswith(suffix):
            s = s[: -len(suffix)]
    return s.strip()


def bracket_openers(path: str, text: str) -> dict[tuple[int, int], int]:
    """For every closing bracket, the line of its opening bracket. Strings and comments are skipped."""
    suffix = Path(path).suffix
    if suffix not in (".java", ".ts", ".tsx", ".js", ".css", ".json"):
        return {}
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[tuple[str, int]] = []
    result: dict[tuple[int, int], int] = {}
    line, col, i, n = 1, 0, 0, len(text)
    quote = None
    template_depth: list[int] = []
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if ch == "\n":
            line += 1
            col = 0
            i += 1
            if quote in ("'", '"'):
                quote = None
            continue
        if quote:
            if ch == "\\":
                i += 2
                col += 2
                continue
            if quote == "`" and ch == "$" and nxt == "{":
                template_depth.append(len(stack))
                stack.append(("{", line))
                quote = None
                i += 2
                col += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            col += 1
            continue
        if ch == "/" and nxt == "/" and suffix != ".css":
            while i < n and text[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            end = text.find("*/", i + 2)
            end = n if end == -1 else end + 2
            line += text.count("\n", i, end)
            i = end
            continue
        if ch in ("'", '"') or (ch == "`" and suffix in (".ts", ".tsx", ".js")):
            if suffix == ".java" and ch == '"' and text.startswith('"""', i):
                end = text.find('"""', i + 3)
                end = n if end == -1 else end + 3
                line += text.count("\n", i, end)
                i = end
                continue
            quote = ch
            i += 1
            col += 1
            continue
        if ch in "([{":
            stack.append((ch, line))
        elif ch in ")]}":
            if template_depth and template_depth[-1] == len(stack) - 1 and ch == "}":
                template_depth.pop()
                stack.pop()
                quote = "`"
                i += 1
                col += 1
                continue
            if stack and stack[-1][0] == pairs[ch]:
                result[(line, col)] = stack.pop()[1]
        i += 1
        col += 1
    return result


OPENER_KINDS = [
    (re.compile(r"\b(class|interface|enum|record)\s+(\w+)"), lambda m: f"the {m.group(1)} <code>{m.group(2)}</code>"),
    (re.compile(r"^\s*(export\s+)?(async\s+)?function\s+(\w+)"), lambda m: f"the function <code>{m.group(3)}</code>"),
    (re.compile(r"^\s*(public|private|protected|static|\s)*[\w<>\[\],.? ]+\s+(\w+)\s*\([^;]*\)\s*(throws [\w, .]+)?\s*\{\s*$"),
     lambda m: f"the method <code>{m.group(2)}</code>"),
    (re.compile(r"^\s*(else\s+)?if\s*\("), lambda m: "the <code>if</code> block"),
    (re.compile(r"^\s*\}?\s*else\b"), lambda m: "the <code>else</code> block"),
    (re.compile(r"^\s*for\s*\("), lambda m: "the <code>for</code> loop"),
    (re.compile(r"^\s*while\s*\("), lambda m: "the <code>while</code> loop"),
    (re.compile(r"^\s*(\}\s*)?try\b"), lambda m: "the <code>try</code> block"),
    (re.compile(r"^\s*\}?\s*catch\b"), lambda m: "the <code>catch</code> block"),
    (re.compile(r"^\s*\}?\s*finally\b"), lambda m: "the <code>finally</code> block"),
    (re.compile(r"^\s*switch\b"), lambda m: "the <code>switch</code>"),
    (re.compile(r"^\s*(const|let|var)\s+(\w+)"), lambda m: f"the value <code>{m.group(2)}</code>"),
    (re.compile(r"^\s*(\w+)\s*:\s*\{\s*$"), lambda m: f"the group <code>{m.group(1)}</code>"),
    (re.compile(r"^\s*([.#:@\w][^{]*)\{\s*$"), lambda m: f"the rules for <code>{esc(m.group(1).strip())}</code>"),
]


def describe_opener(text: str) -> str:
    for pattern, describe in OPENER_KINDS:
        m = pattern.search(text)
        if m:
            return describe(m)
    return "the block"


CLOSING_ONLY = re.compile(r"^[\s)\]};,]*[)\]}][\s)\]};,]*$")
JSX_CLOSE = re.compile(r"^\s*</([A-Za-z][\w.]*)?>\s*[)};,]*\s*$")
JSX_SELF_END = re.compile(r"^\s*/>\s*[)};,]*\s*$")
JSX_GT = re.compile(r"^\s*>\s*$")


def indentation(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def find_jsx_opener(lines: list[str], idx: int, tag: str | None) -> int | None:
    ind = indentation(lines[idx])
    for j in range(idx - 1, -1, -1):
        s = lines[j].strip()
        if indentation(lines[j]) == ind and s.startswith("<") and not s.startswith("</"):
            name = re.match(r"<([A-Za-z][\w.]*)?", s)
            if tag is None or (name and name.group(1) == tag):
                return j + 1
    return None


def auto_blocks(path: str, lines: list[str], text: str, index: dict[str, str]) -> list[Block]:
    """Automatic explanations for boilerplate lines. Hand-written notes override these."""
    blocks: list[Block] = []
    suffix = Path(path).suffix
    name = Path(path).name
    comments = comment_lines(path, lines)
    openers = bracket_openers(path, text)
    closer_line_opener: dict[int, int] = {}
    for (ln, _col), op in openers.items():
        closer_line_opener.setdefault(ln, op)

    # --- comments: one explanation spanning each run of comment lines
    i = 1
    while i <= len(lines):
        if i in comments:
            j = i
            while j + 1 <= len(lines) and j + 1 in comments:
                j += 1
            said = " ".join(t for t in (comment_text(lines[k - 1]) for k in range(i, j + 1)) if t)
            blocks.append(Block(i, j, V.comment_explanation(said, j - i + 1), True, "comment"))
            i = j + 1
        else:
            i += 1

    handled = {n for b in blocks for n in range(b.start, b.end + 1)}

    def add(n: int, text_html: str, kind: str = "auto", end: int | None = None):
        blocks.append(Block(n, end or n, text_html, True, kind))
        for k in range(n, (end or n) + 1):
            handled.add(k)

    lang_rules = {
        ".java": V.java_line, ".ts": V.ts_line, ".tsx": V.ts_line, ".js": V.ts_line, ".css": V.css_line, ".sql": V.sql_line,
        ".yml": V.yaml_line, ".xml": V.xml_line,
    }
    if name == "Dockerfile":
        rule = V.docker_line
    elif name in (".gitignore",):
        rule = V.gitignore_line
    elif name == ".gitattributes":
        rule = V.gitattributes_line
    elif name == ".env.example":
        rule = V.env_line
    else:
        rule = lang_rules.get(suffix)

    context = V.Context(path=path, lines=lines, index=index)
    for n, line in enumerate(lines, 1):
        if n in handled or not line.strip():
            continue
        s = line.strip()
        # closing brackets / JSX closing tags
        if CLOSING_ONLY.match(s) and n in closer_line_opener:
            op = closer_line_opener[n]
            add(n, f"Closes {describe_opener(lines[op - 1])} that began on line {op}.", "close")
            continue
        if suffix == ".tsx":
            m = JSX_CLOSE.match(line)
            if m:
                op = find_jsx_opener(lines, n - 1, m.group(1))
                tag = f"&lt;{m.group(1)}&gt;" if m.group(1) else "fragment <code>&lt;&gt;</code>"
                where = f" that opened on line {op}" if op else ""
                add(n, f"Closes the {tag} element{where}. Everything between the opening and this closing tag is inside it.", "close")
                continue
            if JSX_SELF_END.match(line):
                op = find_jsx_opener(lines, n - 1, None)
                add(n, f"Ends the element that started on line {op}. <code>/&gt;</code> means it has no children inside it.", "close")
                continue
            if JSX_GT.match(line):
                add(n, "Ends the list of settings (props) of the tag above; its contents follow.", "close")
                continue
        if rule:
            result = rule(context, n, line)
            if result:
                if isinstance(result, tuple):
                    add(n, result[0], "auto", result[1])
                else:
                    add(n, result)
    return blocks


# =====================================================================
#  Rendering one file
# =====================================================================
@dataclass
class FileReport:
    path: str
    total: int
    manual: int
    auto: int
    uncovered: list[int]


def render_file(path: str, notes: FileNotes | None, index: dict[str, str]) -> tuple[str, FileReport]:
    text = (ROOT / path).read_text(encoding="utf-8", errors="replace")
    if text.endswith("\n"):
        text_for_lines = text[:-1]
    else:
        text_for_lines = text
    lines = text_for_lines.split("\n")
    summary = notes.summary if notes else ""
    title = V.FILE_TITLES.get(path, "")

    head = [f'<details class="file" id="{anchor(path)}">',
            f'<summary><span class="path">{esc(path)}</span>'
            f'<span class="lines">{len(lines)} lines</span>'
            + (f'<span class="ftitle">{esc(title)}</span>' if title else "") + "</summary>",
            f'<div class="fsummary">{summary or "<p><em>(No summary written.)</em></p>"}</div>']

    if path in SUMMARY_ONLY:
        head.append('<p class="note-box">This file is generated by a tool or copied unchanged from a well-known '
                    'project, so it is described as a whole above instead of line by line. You never need to edit it.</p>')
        head.append("</details>")
        return "\n".join(head), FileReport(path, len(lines), 0, 0, [])

    code = highlight(path, text_for_lines)
    manual_blocks = sorted(notes.blocks if notes else [], key=lambda b: b.start)
    covered_manual = set()
    for b in manual_blocks:
        for k in range(b.start, b.end + 1):
            if k in covered_manual:
                print(f"  ! overlapping note in {path} at line {k}", file=sys.stderr)
            covered_manual.add(k)
        if b.end > len(lines):
            print(f"  ! note beyond end of {path}: {b.start}-{b.end} (file has {len(lines)} lines)",
                  file=sys.stderr)
    autos = [b for b in auto_blocks(path, lines, text_for_lines, index)
             if not any(k in covered_manual for k in range(b.start, b.end + 1))]
    all_blocks = sorted(manual_blocks + autos, key=lambda b: b.start)
    starts = {b.start: b for b in all_blocks}
    covered = {k for b in all_blocks for k in range(b.start, b.end + 1)}

    rows = ['<table class="code"><tbody>']
    uncovered = []
    for n, line in enumerate(lines, 1):
        cells = [f'<tr id="{anchor(path)}-L{n}"><td class="ln">{n}</td><td class="src">{code[n - 1] or " "}</td>']
        if n in starts:
            b = starts[n]
            span = b.end - b.start + 1
            cls = "ex auto" if b.auto else "ex"
            if b.kind == "comment":
                cls += " cm"
            rs = f' rowspan="{span}"' if span > 1 else ""
            cells.append(f'<td class="{cls}"{rs}>{b.html}</td>')
        elif n not in covered:
            if line.strip():
                uncovered.append(n)
                cells.append('<td class="ex missing">(no explanation yet)</td>')
            else:
                cells.append('<td class="ex blank"></td>')
        rows.append("".join(cells) + "</tr>")
    rows.append("</tbody></table>")
    manual_count = len(covered_manual)
    auto_count = len(covered - covered_manual)
    head.extend(rows)
    head.append("</details>")
    return "\n".join(head), FileReport(path, len(lines), manual_count, auto_count, uncovered)


# =====================================================================
#  Indexes built from the code
# =====================================================================
def build_symbol_index(files: list[str]) -> dict[str, str]:
    """Maps our own Java class names and TS module paths to their anchors, for links from imports."""
    index: dict[str, str] = {}
    for f in files:
        if f.endswith(".java"):
            index[Path(f).stem] = anchor(f)
        if f.startswith("frontend/src/") and f.endswith((".ts", ".tsx")):
            index[f[len("frontend/"):].rsplit(".", 1)[0]] = anchor(f)
    return index


MSG_LINE = re.compile(r"^(\s*)(['\w.-]+|'[^']+')\s*:\s*(.*)$")


def messages_catalogue(files: list[str]) -> str:
    """A table of every on-screen text: its key, its words, and every file that shows it."""
    path = "frontend/src/i18n/messages.ts"
    lines = (ROOT / path).read_text(encoding="utf-8").split("\n")
    entries = V.message_entries(lines)
    sources = {f: (ROOT / f).read_text(encoding="utf-8") for f in files
               if f.startswith("frontend/src/") and f.endswith((".ts", ".tsx"))
               and not f.endswith(("messages.ts", ".test.ts"))}
    rows = []
    for key, line_no, value in entries:
        used = []
        # a key such as login.submit is used in code as  t.login.submit
        needle = "t." + key
        for f, src in sources.items():
            for m in re.finditer(re.escape(needle) + r"(?![\w])", src):
                ln = src.count("\n", 0, m.start()) + 1
                used.append(f'<a href="#{anchor(f)}-L{ln}">{esc(f.replace("frontend/src/", ""))}:{ln}</a>')
        rows.append(f'<tr><td><code>t.{esc(key)}</code><br><a class="small" href="#{anchor(path)}-L{line_no}">'
                    f'messages.ts line {line_no}</a></td><td>{esc(value)}</td><td class="small">'
                    f'{", ".join(used) or "<em>used through a variable key (for example t.roles[role])</em>"}</td></tr>')
    return ('<table class="catalogue"><thead><tr><th>Key</th><th>Text shown (edit it in messages.ts)</th>'
            '<th>Where it appears on screen (file:line)</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>")


def backend_messages(files: list[str]) -> str:
    """Every error message the backend can send, with its code and where it is written."""
    rows = []
    for f in files:
        if not f.startswith("backend/src/main/") or not f.endswith(".java"):
            continue
        src = (ROOT / f).read_text(encoding="utf-8")
        for m in re.finditer(r'ApiException\.(notFound|badRequest|conflict|forbidden)\(|new ApiException\(', src):
            start = m.start()
            depth, i = 0, src.index("(", start)
            j = i
            while j < len(src):
                if src[j] == "(":
                    depth += 1
                elif src[j] == ")":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            call = " ".join(src[start:j + 1].split())
            ln = src.count("\n", 0, start) + 1
            kind = m.group(1) or "custom"
            status = {"notFound": "404", "badRequest": "400", "conflict": "409", "forbidden": "403"}.get(kind, "")
            if kind == "custom":
                st = re.search(r"HttpStatus\.(\w+)", call)
                status = {"UNAUTHORIZED": "401", "LOCKED": "423", "GONE": "410", "CONFLICT": "409",
                          "BAD_REQUEST": "400"}.get(st.group(1), st.group(1)) if st else ""
            code_match = re.search(r'"([A-Z][A-Z_]+)"', call)
            if kind == "notFound":
                code = "NOT_FOUND"
            elif kind == "forbidden":
                code = "FORBIDDEN"
            else:
                code = code_match.group(1) if code_match else ""
            texts = re.findall(r'"((?:[^"\\]|\\.)*)"', call)
            message = " … ".join(t for t in texts if not re.fullmatch(r"[A-Z_]+", t))
            if kind == "notFound":
                message = (message or "(the thing)") + " was not found."
            rows.append(f'<tr><td class="nowrap">{status}</td><td><code>{esc(code)}</code></td>'
                        f'<td>{esc(message)}</td><td class="small"><a href="#{anchor(f)}-L{ln}">'
                        f'{esc(f.split("/com/edumate/")[-1])}:{ln}</a></td></tr>')
    return ('<table class="catalogue"><thead><tr><th>HTTP</th><th>Code</th><th>Message the user sees'
            ' (the … parts are filled in by the program)</th><th>Written in</th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table>")


# =====================================================================
#  The page
# =====================================================================
def load_chapters() -> list[tuple[str, str, str]]:
    chapters = []
    for f in sorted(CHAPTERS_DIR.glob("*.html")):
        body = f.read_text(encoding="utf-8")
        m = re.search(r"<h1[^>]*>(.*?)</h1>", body, re.S)
        title = re.sub("<[^>]+>", "", m.group(1)).strip() if m else f.stem
        chapters.append((f.stem, title, body))
    return chapters


def build(strict: bool, report: bool) -> int:
    files = repo_files()
    notes = load_notes()
    index = build_symbol_index(files)
    unknown_notes = [p for p in notes if p not in files]
    for p in unknown_notes:
        print(f"  ! notes for a file that does not exist: {p}", file=sys.stderr)

    sections: dict[str, list[str]] = {}
    reports: list[FileReport] = []
    for f in files:
        html_block, rep = render_file(f, notes.get(f), index)
        sections.setdefault(group_of(f), []).append(html_block)
        reports.append(rep)

    chapters = load_chapters()
    replacements = {
        "{{MESSAGES_CATALOGUE}}": messages_catalogue(files),
        "{{BACKEND_MESSAGES}}": backend_messages(files),
        "{{FILE_TABLE}}": file_table(files, notes),
        "{{STATS}}": stats_html(reports),
        "{{GLOSSARY}}": V.glossary_html(),
        "{{TODAY}}": date.today().strftime("%d %B %Y"),
    }

    toc = ['<ol class="toc">']
    body = []
    for slug, title, content in chapters:
        for k, v in replacements.items():
            content = content.replace(k, v)
        toc.append(f'<li><a href="#{slug}">{esc(title)}</a></li>')
        body.append(f'<section class="chapter" id="{slug}">{content}</section>')
    toc.append('<li><a href="#code">Every file, every line</a><ol>')
    ref = ['<section class="chapter" id="code"><h1>Every file, every line</h1>',
           '<p>Below is every file of the project, in the order you would read it. Click a file name to open it. '
           'Each row shows the line number, the line itself, and what it means. When one explanation covers several '
           'lines it is drawn once, next to all of them. Grey explanations were produced automatically for '
           'repetitive lines (imports, comments, closing brackets, settings); white ones were written by hand.</p>',
           '<p class="btn-row"><button type="button" onclick="toggleAll(true)">Open all files</button> '
           '<button type="button" onclick="toggleAll(false)">Close all files</button></p>']
    for prefix, label in GROUP_ORDER:
        if prefix not in sections:
            continue
        sid = "g-" + (re.sub(r"[^a-z0-9]+", "-", prefix.lower()).strip("-") or "root")
        toc.append(f'<li><a href="#{sid}">{esc(label)}</a></li>')
        ref.append(f'<h2 id="{sid}">{esc(label)}</h2>')
        ref.extend(sections[prefix])
    ref.append("</section>")
    toc.append("</ol></li></ol>")

    page = V.PAGE_TEMPLATE.replace("{{TOC}}", "\n".join(toc)).replace("{{BODY}}", "\n".join(body + ref))
    page = page.replace("{{PYGMENTS_CSS}}", pygments_css())
    page = page.replace("{{TODAY}}", replacements["{{TODAY}}"])
    OUT.write_text(page, encoding="utf-8")

    total = sum(r.total for r in reports)
    missing = sum(len(r.uncovered) for r in reports)
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1_000_000:.1f} MB): {len(files)} files, "
          f"{total} lines, {missing} line(s) without an explanation.")
    if report or strict:
        for r in reports:
            if r.uncovered:
                print(f"  {r.path}: {len(r.uncovered)} uncovered -> {compress(r.uncovered)}")
    return 1 if strict and missing else 0


def pygments_css() -> str:
    """Colours for the code: a light style, and a dark style used in dark mode."""
    from pygments.formatters import HtmlFormatter

    def token_rules(style: str, prefix: str) -> str:
        css = HtmlFormatter(style=style).get_style_defs(prefix)
        return "\n".join(ln for ln in css.splitlines() if re.search(r"td\.src \.\w", ln))

    return (token_rules("default", "td.src") + "\n"
            + token_rules("github-dark", ':root[data-theme="dark"] td.src') + "\n"
            + "@media (prefers-color-scheme: dark) {\n"
            + token_rules("github-dark", ':root:not([data-theme="light"]) td.src') + "\n}")


def compress(nums: list[int]) -> str:
    out, start, prev = [], None, None
    for n in nums + [None]:
        if start is None:
            start = prev = n
        elif n is not None and n == prev + 1:
            prev = n
        else:
            out.append(f"{start}" if start == prev else f"{start}-{prev}")
            start = prev = n
    return ", ".join(out)


def file_table(files: list[str], notes: dict[str, FileNotes]) -> str:
    rows = []
    for f in files:
        title = V.FILE_TITLES.get(f, "")
        rows.append(f'<tr><td><a href="#{anchor(f)}"><code>{esc(f)}</code></a></td><td>{esc(title)}</td></tr>')
    return ('<table class="catalogue"><thead><tr><th>File</th><th>What it is for</th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table>")


def stats_html(reports: list[FileReport]) -> str:
    total = sum(r.total for r in reports)
    manual = sum(r.manual for r in reports)
    auto = sum(r.auto for r in reports)
    return (f"<p>This guide covers <strong>{len(reports)} files</strong> containing <strong>{total:,} lines</strong>. "
            f"{manual:,} lines have a hand-written explanation and {auto:,} lines (imports, comments, closing "
            f"brackets, settings) are explained automatically. Empty lines need no explanation.</p>")


if __name__ == "__main__":
    sys.exit(build(strict="--strict" in sys.argv, report="--report" in sys.argv))
