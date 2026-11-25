"""Render the coverage audit into a readable markdown report."""

import json, os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "tools", "coverage_audit.json"), encoding="utf-8"))

shifts = d["shifts"]
tot_q = sum(len(s["rows"]) for s in shifts)
tot_hit = sum(1 for s in shifts for r in s["rows"] if r["hit"])
tot_scope = sum(1 for s in shifts for r in s["rows"] if r["in_scope"])
art = sum(1 for s in shifts for r in s["rows"] if r["file"] == "art")
pol = sum(1 for s in shifts for r in s["rows"] if r["file"] == "polity")

lines = []
A = lines.append
A("# GK coverage audit — \"Art and Culture.html\" + \"Polity.html\"")
A("")
A(f"- Shifts analysed: **{len(shifts)}** (SSC CGL Tier-I 2024 + 2025)")
A(f"- GK questions: **{tot_q}** (25 per shift)")
A(f"- Questions in the two files' syllabus (Art & Culture / Polity): **{tot_scope}** ({tot_scope/tot_q*100:.1f}%)")
A(f"- Questions whose exact answer is stated in the notes: **{tot_hit}** ({tot_hit/tot_q*100:.1f}% of GK, {tot_hit/tot_scope*100:.1f}% of in-syllabus)")
A(f"- Split: Art & Culture file **{art}**, Polity file **{pol}**")
A(f"- Answers found anywhere in the notes (same subject file): **220** ({220/tot_q*100:.1f}% of GK, {220/tot_scope*100:.1f}% of in-syllabus)")
A(f"- Average strictly-verified per shift: **{tot_hit/len(shifts):.2f}**, answers-present per shift: **{220/len(shifts):.2f}**, in-syllabus per shift: **{tot_scope/len(shifts):.2f}**")
A("")
A("Rule used: the correct option's text must appear in the notes on the same")
A("row/sentence as the question's own subject term (spelling variants allowed).")
A("Statement-style questions whose options are full sentences, and option labels")
A("such as \"Only 1\", were not counted unless the fact itself is written in the notes.")
A("")
A("| # | Shift | Verified | Q no. (answer) |")
A("|---|-------|---------:|----------------|")
for i, s in enumerate(shifts, 1):
    hits = [r for r in s["rows"] if r["hit"]]
    title = s["title"].replace("(Held On: ", "").replace("(Held On - ", "").rstrip(")")
    cells = "; ".join(f"Q{r['qnum']} {r['answer'][:34]}" for r in hits) or "—"
    A(f"| {i} | {title} | {len(hits)} | {cells} |")
A("")
year = Counter()
for s in shifts:
    y = "2024" if "2024" in s["title"] else "2025"
    year[y] += sum(1 for r in s["rows"] if r["hit"])
A("## By year")
A("")
for y in sorted(year):
    n = sum(1 for s in shifts if ("2024" if "2024" in s["title"] else "2025") == y)
    A(f"- {y}: {n} shifts, {year[y]} verified answers ({year[y]/n:.2f} per shift)")
A("")
A("## By subject block")
A("")
micro = Counter()
for s in shifts:
    for r in s["rows"]:
        if r["hit"]:
            micro[r["micro"]] += 1
for k, v in micro.most_common():
    A(f"- {k}: {v}")
A("")

out = os.path.join(ROOT, "GK_COVERAGE_REPORT.md")
open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("wrote", out, "hits", tot_hit, "scope", tot_scope, "total", tot_q)
