"""Build the PYQ addendum for the Art & Culture and Polity notes.

Reads tools/coverage_audit.json (produced by coverage_audit.py), takes every
in-scope question the notes could NOT answer, groups it by micro-topic and
writes it back into the two HTML files as a new, additive study module:

  Art and Culture.html -> unit `u12` (subtopics per micro-topic, HTML tables)
  Polity.html          -> chapter 20 under new Unit V (points arrays)

Existing content is never modified; the modules are appended.

Usage:
    PYTHONIOENCODING=utf-8 python tools/build_pyq_addendum.py
"""

import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / "tools" / "coverage_audit.json"
ART = ROOT / "Art and Culture.html"
POLITY = ROOT / "Polity.html"

# micro-topic -> (subtopic id, title, badge)
ART_TOPICS = [
    ("Classical & Folk Dances of Indian States", "u12_dances",
     "Dances, State Traditions & Exponents", "PYQ Drill"),
    ("Cultural Festivals, Fairs & State Celebrations", "u12_festivals",
     "Festivals, Fairs & State Celebrations", "PYQ Drill"),
    ("Musical Instruments & Renowned Exponents (Gharanas)", "u12_music",
     "Instruments, Gharanas & Musicians", "PYQ Drill"),
    ("Temple Styles (Nagara, Dravida), Caves & UNESCO Sites", "u12_temples",
     "Temples, Caves & UNESCO Sites", "PYQ Drill"),
    ("Bharat Ratna, Padma Awards, Khel Ratna & Film Awards", "u12_awards",
     "Awards, Honours & Recipients", "PYQ Drill"),
]

POLITY_TOPICS = [
    ("Sources of Constitution, Preamble & Schedules", "Sources, Preamble & Schedules"),
    ("Parliament, Lok Sabha, Rajya Sabha & Bills", "Parliament & Bills"),
    ("Supreme Court, High Courts, CAG & Election Commission", "Judiciary & Constitutional Bodies"),
    ("BNSS, BNS, BSA, CrPC & Criminal Procedure", "Criminal Laws & Procedure"),
    ("Landmark Constitutional Amendments (42nd, 44th, 86th, etc.)", "Amendments"),
    ("President & Governor (Powers, Impeachment, Ordinances)", "President, Governor & Ordinances"),
    ("Directive Principles (Art 36–51) & Fundamental Duties (Art 51A)", "DPSP & Fundamental Duties"),
    ("Articles 14–18 (Right to Equality)", "Right to Equality (Art 14–18)"),
    ("Articles 19–22 (Right to Freedom)", "Right to Freedom (Art 19–22)"),
    ("Article 32 & 226 (Writs Jurisdiction)", "Writs (Art 32 & 226)"),
]


def clean(text: str) -> str:
    """Make a string safe inside the HTML data layer and its renderers."""
    text = " ".join(str(text).split())
    text = text.replace("`", "'").replace("${", "$ {")
    return html.escape(text, quote=False)


def load_rows():
    data = json.loads(AUDIT.read_text(encoding="utf-8"))
    rows = [r for shift in data["shifts"] for r in shift["rows"]]
    missed = [r for r in rows if r.get("in_scope") and not r.get("hit")]
    by_topic = defaultdict(list)
    for r in missed:
        q = " ".join(str(r["question"]).split())
        a = " ".join(str(r["answer"] or "").split())
        if not a:
            continue
        key = (q, a)
        if key in by_topic[r["micro"]]:
            continue
        by_topic[r["micro"]].append(key)
    return rows, missed, by_topic


def art_table(pairs) -> str:
    body = []
    for i, (q, a) in enumerate(pairs, 1):
        body.append(
            f"<tr><td>{i}</td><td>{clean(q)}</td>"
            f"<td><mark class=\"exam-hl\">{clean(a)}</mark></td></tr>"
        )
    return (
        "<div class=\"table-scroll\">\n"
        "  <table class=\"study-table\">\n"
        "    <thead>\n"
        "      <tr><th>#</th><th>How SSC asked it (2024–25 PYQ)</th><th>Correct answer</th></tr>\n"
        "    </thead>\n"
        "    <tbody>\n      " + "\n      ".join(body) + "\n    </tbody>\n"
        "  </table>\n"
        "</div>"
    )


def build_art_unit(by_topic) -> str:
    subs = []
    total = 0
    for micro, sid, title, badge in ART_TOPICS:
        pairs = by_topic.get(micro, [])
        if not pairs:
            continue
        total += len(pairs)
        subs.append(
            "          {\n"
            f"            id: `{sid}`,\n"
            f"            title: `{title}`,\n"
            f"            badge: `{badge} · {len(pairs)} Qs`,\n"
            f"            summary: `{len(pairs)} Art & Culture PYQs from the 2024–25 SSC CGL shifts whose answer was missing from the main units.`,\n"
            "            contentHtml: `\n" + art_table(pairs) + "\n            `\n"
            "          }"
        )
    return (
        "      {\n"
        "        id: `u12`,\n"
        "        num: `12`,\n"
        "        shortTitle: `PYQ Addendum`,\n"
        "        title: `PYQ Addendum — Every Missed Art & Culture Fact (2024–25 CGL)`,\n"
        "        category: `Exam Addendum`,\n"
        "        overview: `Question-by-question drill of all " + str(total) + " Art & Culture PYQs from 81 SSC CGL shifts whose exact answer was not written in Units 01–10. Built from the 2024 and 2025 papers only, so every line is a fact SSC has actually asked.`,\n"
        "        subtopics: [\n" + ",\n".join(subs) + "\n        ]\n"
        "      }"
    )


def build_polity_chapter(by_topic) -> str:
    subs = []
    total = 0
    for i, (micro, title) in enumerate(POLITY_TOPICS, 1):
        pairs = by_topic.get(micro, [])
        if not pairs:
            continue
        total += len(pairs)
        points = ",\n".join(
            f"              `<strong>Q:</strong> {clean(q)} <br><mark class=\"exam-hl\">A:</mark> {clean(a)}`"
            for q, a in pairs
        )
        n = len(pairs)
        subs.append(
            "          {\n"
            f"            code: `20.{i}`,\n"
            f"            title: `{title} — {n} PYQs`,\n"
            f"            articles: `SSC CGL 2024–25 · {n} questions`,\n"
            f"            summary: `{n} Polity PYQs whose exact answer was not stated in Chapters 01–19, listed with the official answer key.`,\n"
            f"            story: `These are the gaps between this notebook and the actual paper: every question below was asked in a 2024 or 2025 SSC CGL shift, and the answer text does not appear in the main chapters. Read the question, recall the chapter, then check the answer.`,\n"
            "            storyLink: `Mark this chapter mastered once you can answer all of them without looking.`,\n"
            "            points: [\n" + points + "\n            ],\n"
            f"            landmark: `{n} questions in this block; the answers are the official SSC key, not inferred.`,\n"
            "            takeaway: `Cover the highest-count blocks first — they repeat most often across shifts.`\n"
            "          }"
        )
    return (
        "      {\n"
        "        id: 20,\n"
        "        unitId: 5,\n"
        "        title: `PYQ Addendum — Missed Polity Questions (2024–25)`,\n"
        "        articles: `" + str(total) + " Questions · All Shifts`,\n"
        "        summary: `Every Indian Polity & Constitution question from the 81 SSC CGL 2024–25 shifts whose exact answer was missing from Chapters 01–19, grouped by topic with the official answer key.`,\n"
        "        story: `Chapters 01–19 give you the structure. This chapter gives you the facts the paper actually asked: award years, article numbers, committees, firsts and lasts, all taken from the official SSC keys of the 2024 and 2025 shifts.`,\n"
        "        subtopics: [\n" + ",\n".join(subs) + "\n        ]\n"
        "      }"
    )


def read_raw(path: Path) -> str:
    with open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def write_raw(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def eol_of(text: str) -> str:
    return "\r\n" if "\r\n" in text else "\n"


def inject_art(unit_block: str) -> bool:
    text = read_raw(ART)
    if "id: `u12`" in text:
        print("  art: u12 already present, skipping")
        return False
    start = text.find("const SYLLABUS_UNITS = [")
    if start == -1:
        raise SystemExit("art: SYLLABUS_UNITS not found")
    end = text.find(eol_of(text) + "    ];", start)
    if end == -1:
        raise SystemExit("art: SYLLABUS_UNITS closing bracket not found")
    eol = eol_of(text)
    block = unit_block.replace("\n", eol)
    # append as the last unit so the sidebar keeps 01..11, then 12
    text = text[:end] + "," + eol + block + text[end:]

    # quick-jump dropdown entry
    opt_anchor = "          <option value=\"u11\">11. Practice Quizzes &amp; Flashcards</option>"
    if opt_anchor in text:
        text = text.replace(
            opt_anchor,
            opt_anchor + eol + "          <option value=\"u12\">12. PYQ Addendum (Missed Facts)</option>",
            1,
        )
    write_raw(ART, text)
    print(f"  art: injected u12 (+{len(unit_block)} chars)")
    return True


def inject_polity(chapter_block: str) -> bool:
    text = read_raw(POLITY)
    if "id: 20," in text:
        print("  polity: chapter 20 already present, skipping")
        return False
    eol = "\r\n" if "\r\n" in text else "\n"

    # 1) new unit entry
    unit_anchor = "      { id: 4, numeral: `Unit IV`, title: `Constitutional Bodies, Amendments & Special Provisions`, range: `Chapters 16–19` }"
    if unit_anchor in text:
        text = text.replace(
            unit_anchor,
            unit_anchor + "," + eol +
            "      { id: 5, numeral: `Unit V`, title: `PYQ Addendum (2024–25 Papers)`, range: `Chapter 20` }",
            1,
        )
    else:
        print("  polity: unit anchor not found, UNITS left unchanged")

    # 2) chapter object appended to CHAPTERS
    start = text.find("const CHAPTERS = [")
    if start == -1:
        raise SystemExit("polity: CHAPTERS not found")
    end = text.find(eol + "    ];", start)
    if end == -1:
        raise SystemExit("polity: CHAPTERS closing bracket not found")
    block = chapter_block.replace("\n", eol)
    text = text[:end] + "," + eol + block + text[end:]

    # 3) hardcoded chapter count in the sync label
    text = text.replace(
        "`Progress: ${completedCount}/19 Chapters (${pct}%)`",
        "`Progress: ${completedCount}/${totalChapters} Chapters (${pct}%)`",
    )
    write_raw(POLITY, text)
    print(f"  polity: injected chapter 20 (+{len(chapter_block)} chars)")
    return True


def main():
    rows, missed, by_topic = load_rows()
    total_drill = sum(len(v) for v in by_topic.values())
    print(f"GA questions: {len(rows)} | in-scope missed: {len(missed)} | drill lines: {total_drill}")
    print("Art addendum:")
    inject_art(build_art_unit(by_topic))
    print("Polity addendum:")
    inject_polity(build_polity_chapter(by_topic))


if __name__ == "__main__":
    main()
