"""
Builds docs/Spring-Boot-Zero-to-Pioneer.html, a course on Spring Boot taught through EduMate's own backend.

    python docs/spring-guide/build_spring_guide.py

How it works
  1. Reads every chapter from docs/spring-guide/chapters/*.html, in file-name order.
     The first line of a chapter names its level:  <!-- level: 2 -->
  2. Colours every code block with Pygments. A block is written as
        <pre class="code" data-lang="java">...escaped code...</pre>
     or, to show REAL EduMate code, as
        <pre class="code" data-src="backend/src/.../ClockConfig.java" data-lines="15-26"
             data-expect="Clock.system(CAMPUS_ZONE)"></pre>
     The snippet is read from the file at build time, so the guide always shows the current code.
     data-expect is a piece of text the snippet must contain: if the code moves, the build stops
     with a clear message instead of silently showing the wrong lines.
     data-hl="3,5-7" highlights lines of the snippet (counted from 1).
  3. Gives every <h2> an id, builds the side menu and each chapter's "In this chapter" list,
     and writes one self-contained HTML file (no internet needed to read it).
"""
from __future__ import annotations

import html
import re
import sys
import textwrap
from pathlib import Path

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CHAPTERS = HERE / "chapters"
TEMPLATE = HERE / "template.html"
OUT = ROOT / "docs" / "Spring-Boot-Zero-to-Pioneer.html"
EXPLAINER = "EduMate-Zero-to-Hero.html"

LEVELS = {
    0: ("Orientation", "Start here"),
    1: ("Level 1", "Foundations"),
    2: ("Level 2", "Data"),
    3: ("Level 3", "Production"),
    4: ("Level 4", "Pioneer"),
    5: ("Appendix", "Reference"),
}

EXT_LANG = {".java": "java", ".yml": "yaml", ".yaml": "yaml", ".xml": "xml", ".sql": "sql",
            ".properties": "properties", ".ts": "typescript", ".tsx": "tsx", ".conf": "nginx",
            "Dockerfile": "docker"}

CODE_RE = re.compile(r'<pre class="code"([^>]*)>(.*?)</pre>', re.S)
ATTR_RE = re.compile(r'([\w-]+)="([^"]*)"')
H1_RE = re.compile(r"<h1>(.*?)</h1>", re.S)
H2_RE = re.compile(r"<h2>(.*?)</h2>", re.S)
LEVEL_RE = re.compile(r"<!--\s*level:\s*(\d)\s*-->")


class BuildError(Exception):
    pass


def explainer_anchor(path: str, line: int) -> str:
    """The id the Zero-to-Hero guide gives a line of a file (see anchor() in build_explainer.py)."""
    return "f-" + re.sub(r"[^A-Za-z0-9]+", "-", path).strip("-") + f"-L{line}"


def slug(text: str) -> str:
    plain = re.sub(r"<[^>]+>", "", text)
    plain = html.unescape(plain).lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-")[:60]


def parse_ranges(spec: str) -> list[int]:
    lines: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        a, _, b = part.partition("-")
        lines.extend(range(int(a), int(b or a) + 1))
    return lines


def render_code(attrs: dict[str, str], body: str, where: str) -> str:
    caption = attrs.get("data-title", "")
    link = ""
    if "data-src" in attrs:
        path = attrs["data-src"]
        file = ROOT / path
        if not file.is_file():
            raise BuildError(f"{where}: data-src file not found: {path}")
        all_lines = file.read_text(encoding="utf-8").splitlines()
        first, _, last = attrs.get("data-lines", f"1-{len(all_lines)}").partition("-")
        first_n, last_n = int(first), int(last or first)
        if not (1 <= first_n <= last_n <= len(all_lines)):
            raise BuildError(f"{where}: lines {first_n}-{last_n} are outside {path} ({len(all_lines)} lines)")
        code = textwrap.dedent("\n".join(all_lines[first_n - 1:last_n]))
        expect = attrs.get("data-expect")
        if expect and expect not in code:
            raise BuildError(f"{where}: {path} lines {first_n}-{last_n} no longer contain {expect!r}; "
                             "the code has moved, update data-lines")
        lang = attrs.get("data-lang") or EXT_LANG.get(file.suffix) or EXT_LANG.get(file.name, "text")
        short = path.replace("backend/src/main/java/com/edumate/", "…/edumate/") \
                    .replace("backend/src/test/java/com/edumate/", "…/test/…/edumate/")
        caption = caption or f"{short} · lines {first_n}–{last_n}"
        link = (f'<a class="code-link" href="{EXPLAINER}#{explainer_anchor(path, first_n)}" '
                f'title="Open these lines, explained one by one, in the Zero-to-Hero guide">explained ↗</a>')
    else:
        code = html.unescape(body.strip("\n"))
        code = textwrap.dedent(code)
        lang = attrs.get("data-lang", "text")
    try:
        lexer = get_lexer_by_name(lang)
    except Exception as exc:  # noqa: BLE001
        raise BuildError(f"{where}: unknown language {lang!r}") from exc
    hl = parse_ranges(attrs.get("data-hl", ""))
    # Pygments marks the hl_lines itself: <span class="hll">…line…\n</span>
    coloured = highlight(code, lexer, HtmlFormatter(nowrap=True, hl_lines=hl))
    head = ""
    if caption or link:
        head = f'<div class="code-head"><span>{html.escape(caption)}</span>{link}</div>'
    label = html.escape(lang)
    return (f'<figure class="code-block">{head}<button type="button" class="copy" aria-label="Copy code">Copy</button>'
            f'<pre data-lang="{label}"><code>{coloured}</code></pre></figure>')


def build() -> int:
    chapters = []
    for f in sorted(CHAPTERS.glob("*.html")):
        text = f.read_text(encoding="utf-8")
        m_level = LEVEL_RE.search(text)
        m_title = H1_RE.search(text)
        if not m_level or not m_title:
            raise BuildError(f"{f.name}: needs <!-- level: N --> and an <h1>")
        chapters.append((f.stem, int(m_level.group(1)), m_title.group(1).strip(), text))

    toc_parts: list[str] = []
    body_parts: list[str] = []
    current_level = None
    number = 0
    total_words = 0
    for stem, level, title, text in chapters:
        where = f"chapters/{stem}.html"

        def code_sub(m: re.Match[str]) -> str:
            attrs = {k: html.unescape(v) for k, v in ATTR_RE.findall(m.group(1))}
            return render_code(attrs, m.group(2), where)

        text = CODE_RE.sub(code_sub, text)
        text = LEVEL_RE.sub("", text, count=1)

        subs: list[tuple[str, str]] = []

        def h2_sub(m: re.Match[str]) -> str:
            hid = f"{stem}--{slug(m.group(1))}"
            subs.append((hid, m.group(1)))
            return f'<h2 id="{hid}">{m.group(1)}</h2>'

        text = H2_RE.sub(h2_sub, text)
        words = len(re.sub(r"<[^>]+>", " ", text).split())
        total_words += words
        minutes = max(2, round(words / 180))
        is_numbered = level not in (0, 5)
        if is_numbered:
            number += 1
        label = f"{number}. " if is_numbered else ""

        if level != current_level:
            if current_level is not None:
                toc_parts.append("</ol></li>")
            tag, name = LEVELS[level]
            toc_parts.append(f'<li class="toc-level" data-level="{level}"><span class="toc-level-name">'
                             f'<b>{tag}</b> {name}</span><ol>')
            current_level = level
        plain_title = re.sub(r"<[^>]+>", "", title)
        toc_parts.append(f'<li><a href="#{stem}" data-chapter="{stem}">'
                         f'<span class="tick" aria-hidden="true"></span>{html.escape(label + plain_title)}</a></li>')

        in_chapter = ""
        if subs:
            items = "".join(f'<li><a href="#{hid}">{t}</a></li>' for hid, t in subs)
            in_chapter = f'<nav class="in-chapter" aria-label="In this chapter"><b>In this chapter</b><ol>{items}</ol></nav>'
        tag, name = LEVELS[level]
        meta = (f'<div class="chapter-meta"><span class="level-chip level-{level}">{tag} · {name}</span>'
                f'<span>{minutes} min read</span>'
                f'<label class="done-toggle"><input type="checkbox" data-done="{stem}"> Mark as done</label></div>')
        text = H1_RE.sub(lambda m: f"{meta}<h1>{html.escape(label)}{m.group(1)}</h1>{in_chapter}", text, count=1)
        body_parts.append(f'<section class="chapter" id="{stem}" data-level="{level}">{text}</section>')
    toc_parts.append("</ol></li>")

    def token_rules(style: str, prefix: str) -> str:
        css = HtmlFormatter(style=style).get_style_defs(prefix)
        return "\n".join(ln for ln in css.splitlines() if re.search(r"pre \.\w", ln))

    token_css = "\n".join([
        token_rules("default", ".code-block pre"),
        token_rules("github-dark", ':root[data-theme="dark"] .code-block pre'),
        "@media (prefers-color-scheme: dark) {",
        token_rules("github-dark", ':root:not([data-theme="light"]) .code-block pre'),
        "}",
    ])

    page = TEMPLATE.read_text(encoding="utf-8")
    page = (page.replace("{{TOC}}", "\n".join(toc_parts))
                .replace("{{BODY}}", "\n".join(body_parts))
                .replace("{{PYGMENTS}}", token_css)
                .replace("{{CHAPTERS}}", str(len(chapters)))
                .replace("{{HOURS}}", str(max(1, round(total_words / 180 / 60)))))
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1000:.0f} kB): "
          f"{len(chapters)} chapters, about {total_words:,} words.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(build())
    except BuildError as err:
        print(f"Build stopped: {err}", file=sys.stderr)
        sys.exit(1)
