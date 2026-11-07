#!/usr/bin/env python3
"""Parse tools/timetable.txt and emit timetable-data.js for the index.html planner tab.

Single source of truth: the coded weekly timetable. Everything the UI shows
(daily schedule, per-subject day assignment, coverage) is derived here.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "timetable.txt"
OUT = ROOT / "timetable-data.js"

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SUBJECTS = {
    "reasoning": {"name": "Reasoning", "code": "REA"},
    "quant": {"name": "Quantitative Aptitude", "code": "QA"},
    "english": {"name": "English", "code": "ENG"},
    "ga": {"name": "General Awareness", "code": "GA"},
}
GROUPS = {"2025": {"monday": "2025-08-18"}, "2026": {"monday": "2026-08-17"}}

ALIASES = [
    ("reasoning", re.compile(r"\breason(ing)?\b|अभिक्षमता", re.I)),
    ("quant", re.compile(r"\bquant(itative)?\b|\bmaths?\b|mathematic|अंकगणित", re.I)),
    ("english", re.compile(r"\benglish\b|अंग्रेजी", re.I)),
    ("ga", re.compile(r"\bgeneral awareness\b|\bgeneral studies\b|\bg\.?k\.?\b|\bga\b|\bgs\b|current affairs|सामान्य ज्ञान", re.I)),
]
BREAK = re.compile(r"\bbreak\b|\blunch\b|\brecess\b|\brest\b", re.I)

SLOT = re.compile(
    r"(\d{1,2})(?::(\d{2}))?\s*(?:hrs?|hours?)?\s*(?:-|–|—|to)\s*"
    r"(\d{1,2})(?::(\d{2}))?\s*(?:hrs?|hours?)?\s*[:;\-]?\s*",
    re.I,
)


def minutes(h: str, m: str | None) -> int:
    return int(h) * 60 + int(m or 0)


def to_clock(total: int) -> str:
    """Minutes from 10:00 of the study day (no wrap needed: 22:30-00:00 = 1440+0)."""
    base = 10 * 60
    absolute = base + total
    hours, mins = divmod(absolute % (24 * 60), 60)
    return f"{hours:02d}:{mins:02d}"


def parse() -> dict[str, list[dict]]:
    if not SOURCE.exists():
        raise SystemExit(f"missing {SOURCE}")
    schedule: dict[str, list[dict]] = {d: [] for d in DAYS}
    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([A-Za-z]+day)\s*[:\-]\s*(.+)$", line)
        if not match:
            raise SystemExit(f"line does not start with a weekday: {line!r}")
        day = match.group(1).capitalize()
        if day not in schedule:
            raise SystemExit(f"unknown weekday {day!r}")
        body = match.group(2)
        cursor = 0
        while True:
            found = SLOT.search(body, cursor)
            if not found:
                break
            start = minutes(found.group(1), found.group(2))
            end = minutes(found.group(3), found.group(4))
            cursor = found.end()
            # The label runs until the next time expression begins.
            nxt = SLOT.search(body, cursor)
            label = (body[cursor:nxt.start()] if nxt else body[cursor:]).strip(" ,;:-")
            duration = end - start
            if duration <= 0:
                duration += 24 * 60
            subject = None
            for key, pattern in ALIASES:
                if pattern.search(label):
                    subject = key
                    break
            kind = "break" if (subject is None and BREAK.search(label)) else ("study" if subject else "unparsed")
            schedule[day].append(
                {
                    "start": start - 10 * 60,
                    "end": start - 10 * 60 + duration,
                    "duration": duration,
                    "label": label or "(no label)",
                    "subject": subject,
                    "kind": kind,
                }
            )
    return schedule


def build(schedule: dict[str, list[dict]]) -> dict:
    # Per-day totals
    days = []
    for index, day in enumerate(DAYS):
        sessions = schedule[day]
        totals = {key: 0 for key in SUBJECTS}
        breaks = 0
        unparsed = []
        for slot in sessions:
            if slot["kind"] == "study":
                totals[slot["subject"]] += slot["duration"]
            elif slot["kind"] == "break":
                breaks += slot["duration"]
            else:
                unparsed.append(slot["label"])
        groups = {}
        for group, meta in GROUPS.items():
            start = datetime.fromisoformat(meta["monday"]).date()
            if start.weekday() != 0:
                raise SystemExit(f"cohort start is not a Monday: {start}")
            groups[group] = (start.fromordinal(start.toordinal() + index)).isoformat()
        days.append(
            {
                "day": day,
                "dates": groups,
                "sessions": sessions,
                "studyMinutes": sum(totals.values()),
                "breakMinutes": breaks,
                "totals": totals,
                "unparsed": unparsed,
            }
        )

    # Assign each subject the days where it gets the most time (per cycle group).
    assignments = {}
    coverage = {}
    problems = []
    for group in GROUPS:
        assignments[group] = {key: {} for key in SUBJECTS}
        coverage[group] = {}
        for subject in SUBJECTS:
            ranked = sorted(
                (d for d in DAYS if next(x for x in days if x["day"] == d)["totals"][subject] > 0),
                key=lambda d: (-next(x for x in days if x["day"] == d)["totals"][subject], DAYS.index(d)),
            )
            for rank, day in enumerate(ranked, start=1):
                assignments[group][subject][day] = rank
            covered = [d for d in DAYS if next(x for x in days if x["day"] == d)["totals"][subject] > 0]
            total = sum(next(x for x in days if x["day"] == d)["totals"][subject] for d in DAYS)
            sessions = sum(
                1
                for d in DAYS
                for slot in next(x for x in days if x["day"] == d)["sessions"]
                if slot["kind"] == "study" and slot["subject"] == subject
            )
            coverage[group][subject] = {
                "daysCovered": len(covered),
                "daysMissing": [d for d in DAYS if d not in covered],
                "weeklyMinutes": total,
                "weeklyHours": round(total / 60, 2),
                "sessions": sessions,
                "avgMinutesPerStudyDay": round(total / len(covered), 1) if covered else 0,
            }
            if not covered:
                problems.append(f"{group}: {subject} has no study slot")
    for day in days:
        if day["unparsed"]:
            problems.append(f"{day['day']}: unparsed slots {day['unparsed']}")
        if not day["sessions"]:
            problems.append(f"{day['day']}: no slots parsed")

    weekly = {key: sum(d["totals"][key] for d in days) for key in SUBJECTS}
    return {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "source": "tools/timetable.txt",
        "days": days,
        "assignments": assignments,
        "coverage": coverage,
        "weeklyTotals": weekly,
        "problems": problems,
    }


def main() -> None:
    schedule = parse()
    data = build(schedule)
    OUT.write_text("window.TIMETABLE_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")

    print("Parsed timetable ->", OUT.relative_to(ROOT))
    print(f"{'Day':<10} {'study':>7} {'break':>7}  sessions  per-subject (min)")
    for day in data["days"]:
        parts = " ".join(f"{SUBJECTS[k]['code']}={v}" for k, v in day["totals"].items() if v)
        print(f"{day['day']:<10} {day['studyMinutes']:>7} {day['breakMinutes']:>7}  {len(day['sessions']):>8}  {parts}")
    print("\nWeekly minutes:", {SUBJECTS[k]["code"]: v for k, v in data["weeklyTotals"].items()})
    print("\nCoverage (days per subject):")
    for group, per_subject in data["coverage"].items():
        row = ", ".join(f"{SUBJECTS[k]['code']}={v['daysCovered']}/7 ({v['weeklyHours']}h, {v['sessions']} sessions)" for k, v in per_subject.items())
        print(f"  {group}: {row}")
    print("\nProblems:", data["problems"] or "none")


if __name__ == "__main__":
    main()
