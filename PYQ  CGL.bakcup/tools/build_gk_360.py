import json, re, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "tools", "ga_360_data.json"), encoding="utf-8"))
ROWS = DATA["rows"]
SRC = open(os.path.join(ROOT, "SSC_CGL_2025_GK_PYQ_Notes.html"), encoding="utf-8").read()

CHAPTER_ORDER = [
    ("Indian Polity & Constitution", "Polity & Constitution", "P2.1"),
    ("History & Culture", "History & Culture", "P2.2"),
    ("Geography", "Geography", "P2.3"),
    ("Indian Economy", "Economy", "P2.4"),
    ("General Science", "General Science", "P2.5"),
    ("Static GK & Current Affairs", "Static GK & Current Affairs", "P2.6"),
]


def clean(s):
    s = html.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", s).strip()


def short(s, n):
    s = clean(s)
    if len(s) <= n:
        return s
    cut = s[:n]
    cut = re.split(r"(?<=[.;,!?])\s+", cut)[0] if re.search(r"[.;,!?]\s", cut) else cut
    cut = cut.rsplit(" ", 1)[0] if " " in cut else cut
    return cut.rstrip(" ,;:") + " …"


GENERIC_RE = re.compile(
    r"^(only\s+)?(statement\s+)?(both\s+)?(1|2|3|4|a|b|c|i|ii|iii|iv)(\s*(,|and|&)\s*(1|2|3|4|a|b|c|i|ii|iii|iv))*(\s*(is|are))?\s*(correct|true|only)?\.?$",
    re.I,
)


def is_generic(a):
    a = clean(a).lower().strip(" .")
    if not a:
        return True
    if a.startswith(("both a and r", "a is true", "a is false", "neither 1", "neither a", "all of these", "none of these")):
        return True
    if a.startswith(("1 and", "2 and", "3 and", "1,", "2,", "only 1", "only 2", "only 3", "only statement", "both 1", "both 2")):
        return True
    return bool(GENERIC_RE.match(a))


def keyfact(row):
    sol = clean(row.get("solution", ""))
    if not sol:
        return ""
    sol = re.sub(r"^The Correct answer is .*?(?=\s|$)", "", sol, flags=re.I)
    m = re.search(r"Key Points\s*(.*?)(?:Additional Information|$)", sol, re.I)
    text = m.group(1) if m else sol
    text = re.sub(r"^(?:\W|the correct answer is\b).*?(?=[A-Z])", "", text)
    parts = re.split(r"(?<=[.!?])\s+", text)
    for p in parts:
        p = p.strip(" -–—")
        if len(p) >= 35 and not re.match(r"^(the correct answer|this option|option|it is|these|the given)", p, re.I):
            return short(p, 210)
    return ""


def answer_of(row):
    a = clean(row.get("answer", ""))
    if not a:
        a = clean((row.get("options") or {}).get(row.get("correct_option", ""), ""))
    return short(a, 165)


# ---- build Part 2 ----
groups = {}
for r in ROWS:
    groups.setdefault((r["chapter"], r["topic"], r["micro"]), []).append(r)

for v in groups.values():
    v.sort(key=lambda x: (x.get("shift", ""), x.get("qnum", 0)))

chapter_html = []
for chapter, label, num in CHAPTER_ORDER:
    crows = [r for r in ROWS if r["chapter"] == chapter]
    topics = []
    for (ch, t, m), rows in groups.items():
        if ch != chapter:
            continue
        topics.append((t, m, rows))
    topics.sort(key=lambda x: (-len(x[2]), x[0], x[1]))
    out = [f'<section class="qbank" id="{num}">']
    out.append(
        f'<h2><span class="num">{num}</span>{html.escape(label)} '
        f'<span class="count">{len(crows)} Qs · complete</span></h2>'
    )
    for t, m, rows in topics:
        star = " HIGH" if len(rows) >= 20 else ""
        out.append(
            f'<h3>{html.escape(t)} — {html.escape(m)} '
            f'<span class="qcount">{len(rows)} Qs{star}</span></h3>'
        )
        out.append('<ul class="qlist">')
        for r in rows:
            q = clean(r["question"])
            q = re.sub(r"^Read the below statements marked as Assertion \(A\) and Reason \(R\)\. Mark the correct options:\s*", "Assertion–Reason: ", q, flags=re.I)
            q = re.sub(r"^Consider the following statements(?: about| regarding| on)?\s*:?\s*", "Statements: ", q, flags=re.I)
            q = short(q, 235)
            a = answer_of(r)
            missing = not bool(a)
            if missing:
                a = "answer not in source"
            extra = ""
            if is_generic(r.get("answer", "")):
                kf = keyfact(r)
                if kf:
                    extra = f' <span class="fact">{html.escape(kf)}</span>'
            starq = ""
            acls = "ar missing" if missing else "ar"
            out.append(
                f'<li><span class="qq">{html.escape(q)}</span> '
                f'<span class="{acls}">→ {html.escape(a)}</span>{starq}{extra}</li>'
            )
        out.append("</ul>")
    out.append("</section>")
    chapter_html.append("\n".join(out))

high_yield = """
  <section id="hymap">
    <h2><span class="num">08</span>High-Yield Map <span class="count">where the 15+ marks sit</span></h2>
    <p>These are the repeated micro-topics from the 1,125 questions. Revise this table first; it is the shortest route to a safe 15.</p>
    <table class="hymap">
      <tr><th>Repeated area</th><th>PYQs</th><th>What to lock</th></tr>
      <tr><td>Sports, tournaments &amp; winners</td><td>77</td><td>Grand Slams, World Cups, national championships, award winners</td></tr>
      <tr><td>Stadiums, trophies &amp; sports terms</td><td>67</td><td>stadium&ndash;city, trophy&ndash;sport, terminology</td></tr>
      <tr><td>Space, defence &amp; sci-tech current affairs</td><td>57</td><td>ISRO missions, exercises, missiles, satellites</td></tr>
      <tr><td>Classical &amp; folk dances</td><td>51</td><td>state&ndash;dance pairs, festival dance, exponents</td></tr>
      <tr><td>GDP, GNP, NNP &amp; national income</td><td>51</td><td>definitions, real vs nominal, base year</td></tr>
      <tr><td>Temples, caves &amp; UNESCO sites</td><td>46</td><td>Nagara/Dravida, rock-cut caves, state&ndash;location</td></tr>
      <tr><td>Famous books &amp; autobiographies</td><td>43</td><td>author&ndash;book, book&ndash;subject, award</td></tr>
      <tr><td>Flagship schemes &amp; welfare programmes</td><td>41</td><td>scheme&ndash;ministry, beneficiary, launch year</td></tr>
      <tr><td>Reports, indices &amp; global rankings</td><td>40</td><td>index&ndash;publisher, India rank, theme</td></tr>
      <tr><td>Festivals, fairs &amp; state celebrations</td><td>37</td><td>state&ndash;festival, reason, community</td></tr>
      <tr><td>Atmosphere, winds, cyclones &amp; currents</td><td>32</td><td>layer facts, local winds, ocean currents</td></tr>
      <tr><td>BNS, BNSS, BSA &amp; criminal procedure</td><td>31</td><td>new law replaces old, key feature, timeline</td></tr>
      <tr><td>Summits, exercises &amp; appointments</td><td>30</td><td>summit&ndash;place, exercise&ndash;country, post-holder</td></tr>
      <tr><td>Instruments, gharanas &amp; musicians</td><td>26</td><td>instrument&ndash;exponent, gharana, state</td></tr>
      <tr><td>Agriculture, cropping seasons &amp; minerals</td><td>26</td><td>crop&ndash;season, mineral&ndash;state, soil</td></tr>
      <tr><td>Rivers, dams &amp; multipurpose projects</td><td>25</td><td>river origin, dam&ndash;state, tributary</td></tr>
      <tr><td>Parliament, bills &amp; procedures</td><td>23</td><td>bill type, majority, article</td></tr>
      <tr><td>Census 2011 &amp; demography</td><td>19</td><td>density, literacy, sex ratio, state topper</td></tr>
    </table>
    <p class="note">If you remember only this page plus the tables in Part 1, you have covered the repeated core. Use Part 2 to fill gaps, not to memorise everything.</p>
  </section>
"""

last_box = """
<div class="last-box">
  <h3>Last-mile plan &mdash; turn coverage into 15+</h3>
  <ol>
    <li><b>First pass (20 min):</b> read Part 1 tables, then the High-Yield Map. Do not touch the 1,125-line bank yet.</li>
    <li><b>Second pass (60 min):</b> scan one Part 2 chapter, cover the answer, and retry only the missed lines.</li>
    <li><b>Exam order:</b> direct one-liners first; statement/assertion and chronology questions last.</li>
    <li><b>Cut losses:</b> if a question needs more than 45 seconds, mark and move. One GA mark is not worth two minutes.</li>
    <li><b>Last 24 hours:</b> revise only the <b>HIGH</b> groups and the High-Yield Map. Skip niche one-offs.</li>
  </ol>
</div>
"""

part2 = """
<div class="part-break"></div>
<div class="part-head">
  <div class="kicker">Part 2 &middot; Complete coverage</div>
  <h2 class="part-title">All 1,125 PYQ Questions &mdash; Basic Answer Bank</h2>
  <p>Every General Awareness question from all 45 shifts, reduced to the question and its answer. No long explanations. Groups are ordered by question count; <b>HIGH</b> marks a micro-topic with 20+ PYQs &mdash; those are the repeated, must-know areas. 25 questions had no answer key in the source; they are marked <i>answer not in source</i>.</p>
  <p class="topics"><b>Most repeated areas:</b> sports &amp; trophies (77) &middot; stadiums/terminology (67) &middot; space &amp; defence (57) &middot; dances (51) &middot; GDP concepts (51) &middot; temples/caves (46) &middot; books (43) &middot; schemes (41) &middot; reports/indices (40) &middot; festivals (37).</p>
</div>
""" + "\n".join(chapter_html) + last_box

# ---- assemble ----
style_start = SRC.find("<style>")
style_end = SRC.find("</style>") + len("</style>")
style = SRC[style_start:style_end]

sheet_start = SRC.find('<div class="sheet">') + len('<div class="sheet">')
sheet_end = SRC.rfind("</div>")
inner = SRC[sheet_start:sheet_end]

# replace masthead
h_start = inner.find('<header class="masthead">')
h_end = inner.find("</header>") + len("</header>")
new_header = """
  <header class="masthead">
    <div class="kicker">SSC CGL 2025 &middot; General Awareness &middot; 360&deg; Basic Mastery</div>
    <h1>GK 360&deg;</h1>
    <p class="sub">All <b>1,125 GA PYQs</b> from 45 shifts, plus the repeated basics behind them. Shallow, broad and exam-facing &mdash; built to push you from 7&ndash;10 to <b>15+ correct</b>, not to chase narrow one-off trivia.</p>
    <div class="legend"><span><b>Part 1</b> = high-yield basics</span><span><b>Part 2</b> = all 1,125 Q&rarr;A</span><span><b>HIGH</b> = 20+ PYQ micro-topic</span><span>No deep theory</span></div>
    <p class="scope"><b>How to use:</b> learn Part 1 first (8 pages). Then scan Part 2 chapter by chapter &mdash; it is the complete safety net, not a second textbook. In the exam, clear direct one-liners first; leave long statement/assertion questions for the end.</p>
  </header>
  <div class="target">
    <div><b>15+ target</b><span>8 static/culture + 4 polity/economy + 3 science/geography</span></div>
    <div><b>Do first</b><span>Direct one-liners: dance, festival, scheme, book, award, capital, unit</span></div>
    <div><b>Do last</b><span>Long statement, assertion&ndash;reason and chronological-order questions</span></div>
  </div>
"""
inner = inner[:h_start] + new_header + inner[h_end:]

# Part 1 banner before polity section
inner = inner.replace(
    '<section id="polity">',
    '<div class="part-banner"><span>Part 1</span> Basic Mastery Capsule &mdash; the repeated facts and links</div>\n  <section id="polity">',
    1,
)

# high-yield map replaces the old footer; Part 2 follows on a fresh page
inner = re.sub(r"<footer>.*?</footer>", high_yield + part2, inner, count=1, flags=re.S)

extra_css = """
  td,th{overflow-wrap:anywhere}
  .target{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4mm;margin:2mm 0 3mm}
  .target div{background:var(--soft);border:.4pt solid var(--line);padding:1.4mm 1.6mm;font-size:7pt;line-height:1.25}
  .target b{display:block;font-size:8pt;color:var(--accent);margin-bottom:.4mm}
  .target span{color:var(--muted)}
  .part-banner{column-span:all;background:var(--accent);color:#fff;font-weight:700;font-size:8.6pt;letter-spacing:.02em;padding:1.5mm 2.4mm;margin:3mm 0 1mm;border-radius:2px}
  .part-banner span{background:#fff;color:var(--accent);padding:.3mm 1.4mm;border-radius:2px;margin-right:1.6mm;font-size:7.4pt}
  .part-break{break-before:page;page-break-before:always}
  .part-head{column-span:all;border-bottom:2pt solid var(--accent2);padding-bottom:2mm;margin-bottom:2mm}
  .part-head .kicker{color:var(--accent2)}
  .part-title{font-size:16pt;line-height:1.1;margin:1mm 0 1mm;color:var(--accent2);border:0;padding:0}
  .part-head p{font-size:7.6pt;color:var(--muted);margin:0 0 .8mm;max-width:180mm}
  .part-head .topics{font-size:7.2pt;color:var(--accent);margin:0}
  .ar.missing{color:var(--muted);font-weight:400;font-style:italic}
  .qbank{font-size:6.9pt;line-height:1.24}
  .qbank h2{font-size:10.8pt;margin-top:2.6mm}
  .qbank h3{font-size:7.4pt;margin:1.7mm 0 .7mm;letter-spacing:.02em;text-transform:none;color:#0a5b42;border-bottom:.4pt dotted var(--line);padding-bottom:.4mm;break-after:avoid}
  .qcount{display:inline-block;margin-left:1.2mm;font-size:6.4pt;color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0}
  .qbank h2 .count{float:none;margin-left:1.6mm}
  .qlist{list-style:none;margin:0 0 1.4mm;padding:0}
  .qlist li{margin:0 0 .85mm;padding:0 0 .65mm;border-bottom:.3pt solid #edf2ef;break-inside:avoid}
  .qq{color:#1d3128}
  .ar{color:var(--accent2);font-weight:700}
  .fact{color:var(--muted);font-size:6.5pt}
  .star{color:#b45309;font-weight:700;font-size:6pt;letter-spacing:.04em}
  .hymap{font-size:7.8pt;line-height:1.28}
  .hymap th,.hymap td{padding:.75mm .8mm}
  .hymap td:first-child{width:32%}
  .hymap td:nth-child(2){width:9%;font-weight:700;color:var(--accent);text-align:center}
  .hymap td:nth-child(3){width:59%;color:var(--muted)}
  .note{font-size:7pt;color:var(--muted);border-left:2pt solid var(--accent2);padding-left:1.8mm;margin:1.2mm 0 0}
  .last-box{column-span:all;margin:2.5mm 0 1mm;padding:1.8mm 2.2mm;background:#fbf4ef;border-left:2pt solid var(--accent2);font-size:7.2pt;color:var(--muted);break-inside:avoid}
  .last-box h3{margin:0 0 1mm;color:var(--accent2);font-size:8pt}
  .last-box ol{margin:0;padding-left:4mm}
  .last-box li{margin:0 0 .6mm}
  @media print{
    .target{gap:1mm}
    body{font-size:7.4pt;line-height:1.24}
    table{font-size:7.2pt;line-height:1.18}
    th,td{padding:.45mm .65mm}
    h2{margin-top:2.6mm;margin-bottom:1.2mm}
    h3{margin-top:1.6mm;margin-bottom:.7mm}
    .qbank{font-size:6.55pt;line-height:1.2}
    .qlist li{margin-bottom:.6mm;padding-bottom:.45mm}
  }
"""

new = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SSC CGL 2025 GK 360 - Basic Mastery + All PYQs</title>
{style}
<style>{extra_css}</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">{inner}</div>
</body>
</html>
"""

out = os.path.join(ROOT, "SSC_CGL_2025_GK_360_Basic_Mastery.html")
open(out, "w", encoding="utf-8").write(new)
print("wrote", out, len(new), "chars")
print("generic:", sum(1 for r in ROWS if is_generic(r.get("answer", ""))))
print("keyfacts:", sum(1 for r in ROWS if is_generic(r.get("answer", "")) and keyfact(r)))
