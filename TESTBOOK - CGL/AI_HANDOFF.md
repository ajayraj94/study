# AI HANDOFF — SSC CGL Command Center (tagging + timetable)

Read this before changing anything. It records what was built, why, the exact commands,
the traps that already caused real bugs, and what to do when 2024 / 2023 papers arrive.

Project root: `C:\E_Drive\my_work\cgl 2026\StudyMaterial_Uplaod\TESTBOOK - CGL`
(Windows + bash. Note the "Uplaod" typo in the path.) The directory is **not a git repo** —
`git status` fails, so never rely on git to undo anything.

---

## 1. What this project is

A single-page study app (`index.html`, a compiled React bundle) over 45 testbook SSC CGL
shifts. Every question in `2025/*.json` is tagged into a 4-tier taxonomy
(Subject → Chapter → Topic → Micro-topic) and the app renders weightage, per-question
status, SRS, and a 7-day timetable.

There are exactly **4 sections** in SSC CGL Tier-1: Reasoning (Q1–25, 25 Qs),
General Awareness (Q26–50, 25 Qs), Quantitative Aptitude (Q51–75, 25 Qs),
English (Q76–100, 25 Qs). 4 sections × 25 Qs × 45 shifts = **4500 questions**.
If someone asks "why only 4 sections", that is correct by exam design — the problem is
always *content* (wrong tags), never the section count.

Section is decided by question number in `tools/taxonomy-rules.mjs`:

```js
q.number 1..25   -> reasoning
q.number 26..50  -> ga
q.number 51..75  -> quant
q.number 76..100 -> english
```

(It also accepts `q.section` text, but number ranges are the reliable signal.)

---

## 2. File map

| Path | Role |
| --- | --- |
| `2025/*.json` | Source papers (45 files). `tag-questions.mjs` **rewrites** these to add `q.meta`. |
| `2025/*.html` | Original scraped pages; source of `explanation_html` (merged by `tools/merge-explanation-html.mjs`). |
| `taxonomy.json` | **Generated** from `tools/build-taxonomy.mjs`. Never hand-edit — it gets overwritten. |
| `tools/build-taxonomy.mjs` | The real taxonomy source (subjects → chapters → topics → microTopics). |
| `tools/taxonomy-rules.mjs` | Subject mapping + dispatcher that calls the four classifiers. |
| `tools/ga-rules.mjs` | GA classifier (scored, stem-first). |
| `tools/en-rules.mjs` | English classifier (instruction-driven decision tree). |
| `tools/rea-rules.mjs` | Reasoning classifier (instruction-driven decision tree). |
| `tools/quant-rules.mjs` | Quant classifier (specificity-ordered chain). |
| `tools/tag-questions.mjs` | Runs classification, writes `q.meta` back into `2025/*.json`, builds `tags-index.json` + `tagging-report.md`. |
| `tools/generate-compact-index.mjs` | Builds `tags-index-compact.js` (`window.SSC_TAGS_INDEX`) that the app loads. |
| `tags-index.json` / `tags-index-compact.js` | Generated indexes (4500 entries). |
| `tagging-report.md` | Generated audit report. |
| `tools/timetable.txt` | Hand-edited coded weekly schedule (single source of truth). |
| `tools/analyze_timetable.py` | Parses `timetable.txt` → `timetable-data.js` (does all the maths). |
| `timetable-data.js` | Generated: `window.TIMETABLE_DATA` (days, sessions, assignments, coverage, problems). |
| `timetable.js` | Renders the Timetable tab overlay from `TIMETABLE_DATA`. |
| `index.html` | The app. Loads `tags-index-compact.js`, `timetable-data.js`, `timetable.js`. |

---

## 3. The pipeline (run in this order, from project root)

```bash
node tools/build-taxonomy.mjs        # only when taxonomy.json must change
node tools/tag-questions.mjs         # classify 4500 questions -> JSON + tags-index.json
node tools/generate-compact-index.mjs
python tools/analyze_timetable.py    # only when tools/timetable.txt changes
```

The old `build-questions-bank.mjs` helper was **deleted on 7 Nov 2026**: it wrote
`questions-data.js`, which nothing loaded. The app gets its questions from
`tags-index-compact.js` plus the user's own file upload — there is no bank step to run.

Expected output of `tag-questions.mjs`:
`Successfully generated tags-index.json. Total questions processed: 4500 across 45 shifts.`

After any data change remind the user to hard-reload (`Ctrl+F5`) — the browser caches
`tags-index-compact.js` and `timetable-data.js`, and stale cache has already caused at
least one false "your fix didn't work" report.

---

## 4. Classifier architecture (do not "simplify" this back into one if/else chain)

The original single `if/else` chains produced catastrophic distributions (English 551
questions in one cloze bucket, Reasoning 520 in one analogy bucket). The rules are now
split per subject with explicit priorities.

### GA — `tools/ga-rules.mjs` (scored)
- `GA_RULES` = 60 rule ids, each with term lists. `wb(term)` builds a **word-boundary**
  regex (see trap #1). `rank()` counts each term separately, then `decide()` applies
  `MIN_SCORE=8`, `MIN_SECONDARY=5`.
- **Stem-primary**: explanation text is only a fallback and is weighted lower, so
  explanations cannot outvote the question (see trap #2).
- `EXTRA_TERMS` (26 keys) is merged by a loop. Adding a duplicate key silently discards
  one group — always run the duplicate-key audit (trap #3).
- Fallback bucket: `ga-gk-misc`.

### English — `tools/en-rules.mjs` (ordered decision tree)
SSC English items are templated; the instruction line identifies the type. Order:
rearrange → narration (interrogative/imperative/assertive) → voice → error spotting
(sub-split SVA / tense / preposition / pronoun / article) → improvement → one-word
substitution (phobias / gov-society / specialists) → idiom/proverb → spelling →
synonym → antonym → cloze (only with a passage + blanks) → RC (inference vs factual) →
word usage/homonym → standalone fill-in-the-blank decided by **what the options are**
(preposition / comparative / determiner / verb form / vocabulary).
Fallback: `eng-misc`.

### Reasoning — `tools/rea-rules.mjs`
Non-verbal → deductive (assumption / conclusion / syllogism) → blood relations
(pointing / coded / family tree) → seating & ranking & direction → coding-decoding →
operator substitution → alphabet test → series → odd-one-out → analogy (unit / geo /
instrument / worker / letter) → matching (address/symbol) → word formation →
"place of question mark" decided by option type.
Fallback: `rea-misc`.

### Quant — `tools/quant-rules.mjs`
Ordered by **specificity**, not by topic order: DI → fraction ordering → trigonometry →
geometry → mensuration 3D → mensuration 2D → interest → mixture (before P&L: "blended
and sold" is mixture) → profit/loss/discount → average → time-work/pipes → speed/trains/
boats/races → ratio/partnership/ages → algebra → number system → percentage (last,
because `%` appears everywhere).
Fallback: `quant-misc`.

Note: **Averages** (`avg-basic`, `avg-weighted`, `avg-change`) was added to the taxonomy
during this work — SSC asks it every shift and it had no home before.

---

## 5. Taxonomy rules (violating these breaks the app silently)

1. `taxonomy.json` is generated. Edit `tools/build-taxonomy.mjs`, then run it.
2. Every `microTopicId` a classifier returns must exist in the taxonomy, or the question
   gets no path and becomes an orphan (`chapterId === "general"`).
3. Never duplicate an object key in a rules file — the later one wins and the earlier
   terms vanish without warning (this already wiped "green credit programme",
   "zonal council", "inter-state council", "emissions", "thoda" once).
4. All four subjects have an honest fallback micro-topic: `eng-misc`, `rea-misc`,
   `quant-misc`, `ga-gk-misc`. A non-zero count is a *lead*, not necessarily a failure —
   but a high count means the rules are missing an instruction pattern.
5. Changing chapter/topic structure changes chapter counts in the UI; that is expected,
   but re-check the "chapters" badge in the header.

---

## 6. Verification recipes (copy-paste)

### 6.1 Distribution + fallback audit
```bash
node -e '
const fs=require("fs");
const idx=JSON.parse(fs.readFileSync("tags-index.json","utf8"));
for(const sid of ["reasoning","quant","english","ga"]){
  const seen=new Set(), ch={}, mic={}; let misc=0;
  for(const v of Object.values(idx.byKey)){
    if(v.subjectId!==sid||seen.has(v.key))continue; seen.add(v.key);
    ch[v.chapterName]=(ch[v.chapterName]||0)+1;
    mic[v.microTopicId]=(mic[v.microTopicId]||0)+1;
    if(/misc/.test(v.microTopicId)) misc++;
  }
  console.log("\n"+sid+" n="+seen.size+" misc="+misc);
  Object.entries(mic).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .forEach(([k,c])=>console.log("   "+String(c).padStart(4)+"  "+k));
}'
```

### 6.2 Orphan check (must print 0)
```bash
node -e '
const fs=require("fs");
const idx=JSON.parse(fs.readFileSync("tags-index.json","utf8"));
let orphans=0, total=0;
for(const [k,v] of Object.entries(idx.byKey)){
  if(!k.startsWith("M"))continue; total++;
  if(!v.chapterId||v.chapterId==="general") orphans++;
}
console.log("questions:", total, "orphans:", orphans);'
```

### 6.3 Duplicate object-key audit (JS silently drops duplicates)
```bash
grep -n "const EXTRA_TERMS" -A 400 tools/ga-rules.mjs | grep -oE '^\s*[0-9]+-\s*"[a-z0-9-]+"' | sort | uniq -d
```

### 6.4 Spot-check that a tag matches the stem
```bash
node -e '
const fs=require("fs");
const idx=JSON.parse(fs.readFileSync("tags-index.json","utf8"));
const shift=idx.shifts[0], data=JSON.parse(fs.readFileSync("2025/"+shift.fileName,"utf8"));
for(let n=1;n<=25;n++){
  const k=`M1-Q${n}`, t=idx.byKey[k], q=data.questions.find(x=>x.number===n);
  console.log(k, t.microTopicId.padEnd(30), String(q.question||"").replace(/<[^>]+>/g," ").slice(0,80));
}'
```

### 6.5 Kill "isodated" misc items — cluster them by instruction
```bash
node -e '
const fs=require("fs"); const idx=JSON.parse(fs.readFileSync("tags-index.json","utf8"));
const cache={}, g={}, seen=new Set();
for(const v of Object.values(idx.byKey)){
  if(seen.has(v.key))continue; seen.add(v.key);
  if(!/misc/.test(v.microTopicId))continue;
  const m=v.key.match(/^M(\d+)-Q(\d+)$/), fn=idx.shifts[+m[1]-1].fileName;
  cache[fn]=cache[fn]||JSON.parse(fs.readFileSync("2025/"+fn,"utf8"));
  const q=cache[fn].questions.find(x=>x.number===+m[2]);
  const s=String(q.question||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const key=v.subjectId+" "+s.toLowerCase().split(/\s+/).slice(0,9).join(" ");
  g[key]=(g[key]||0)+1;
}
Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,c])=>console.log(String(c).padStart(3),k));'
```
Fix the biggest clusters by adding the missing instruction pattern — that is how
`rea-matching` (address matching) and `rea-word-formation` were discovered.

### 6.6 Validate the app after editing `index.html`
The bundle inside `<script type="module">` is compiled JS (no JSX), so it can be
syntax-checked directly. A stray bracket there kills the entire app.
```bash
node -e '
const fs=require("fs"); const h=fs.readFileSync("index.html","utf8");
const i=h.indexOf("type=\"module\""), o=h.indexOf(">",i)+1, c=h.indexOf("</script>",o);
fs.writeFileSync("tools/_bundle_check.mjs", h.slice(o,c));'
node --check tools/_bundle_check.mjs && echo "bundle OK"
rm -f tools/_bundle_check.mjs
```

---

## 7. Traps that already caused real bugs

1. **Substring keyword matching.** `allText.includes("cag")` matched "gluca**cag**on",
   so a general-science question was filed under Indian Polity/CAG. Always match terms
   on word boundaries: `(^|[^a-z])term([^a-z]|$)`.
2. **Explanation text outvoting the stem.** 129 questions were mis-tagged because the
   explanation mentioned the "real" topic. Classify from the stem; use the explanation
   only as a low-weight fallback.
3. **Duplicate object keys** (see §5.3) silently delete rules.
4. **HTML entities in stems.** `&radic;`, `&times;`, `&divide;`, `&pi;`, `&deg;`, `&sup2;`,
   `&theta;` broke every sqrt/trig/substitution rule until `clean()` decoded them.
   Reasoners must always normalise entities before regex matching.
5. **Over-broad trig detection.** `/sin|cos|tan/` matched "bu**sin**ess", "u**sin**g",
   "proce**ssing**" and swallowed **322** quant questions into trigonometry. Use
   `(^|[^a-z])(sin|cos|tan|sec|cot|cosec)([^a-z]|$)`.
6. **Letter-analogy heuristic.** `/[a-z]+ : [a-z]+/` matched every "Watt : Power" stem.
   Restrict letter analogy to short uppercase clusters (`/\b[A-Z]{1,4}\s*:\s*[A-Z]{1,4}\b/`).
7. **"related to" implies blood relation?** No. Only treat pointers ("pointing", "photo")
   and relative nouns as blood relations; "second word is related to the first" is analogy.
8. **Missing taxonomy entries** get silently dropped: `ga-pol-criminal-law` existed only
   in `taxonomy.json`, so regenerating orphaned 34 questions. Always add to
   `build-taxonomy.mjs`, then regenerate.
9. **Python timetable parser, anchored regex.** `re.compile("^\\s*(...time...)")` with a
   moving `cursor` matched only the first slot per day. Time patterns must be unanchored.
10. **Absolute vs relative minutes.** Storing clock minutes (10:00 = 600) while the UI
    added a 10:00 base again rendered Reasoning as "20:00–21:30". `TIMETABLE_DATA` stores
    **offsets from 10:00**; `clock()` adds the base.
11. **Minified bundle edits.** Inserting JSX into `index.html` must match the existing
    compiled style (`i.jsxs("button",{...})`). Always run the §6.6 check afterwards.
12. **`tagging-report.md` "High Yield" badge** is `shiftFrequencyPct >= 65`, so a large
    share of micro-topics earn 🔥. This is cosmetic and currently unfixed; if the user
    complains that "everything is high yield", the fix belongs in
    `tools/tag-questions.mjs` (`isHighYield`).

---

## 8. Baseline numbers (current state — compare after any change)

```
Total questions 4500 | 45 shifts | 1125 per subject

reasoning  n=1125  chapters=6  biggest: rea-misc=236 (21.0%)  <- main outstanding work
quant      n=1125  chapters=13 biggest: mens-circle-sector=80
english    n=1125  chapters=4  biggest: eng-modifiers-conjunctions=140
ga         n=1125  chapters=6  biggest: ga-ca-sports-awards=77, misc=5

GA chapters: Static GK 340 | History & Culture 281 | Polity 157
             Economy 138 | Geography 131 | Science 78
Weekly timetable: 630 min study + 210 min break per day (10:00–24:00)
  REA 9.0h (Mon,Tue) | QA 21.0h (Wed–Sun) | ENG 22.5h (all 7) | GA 21.0h (all 7)
```

Known outstanding: **236 Reasoning items still in `rea-misc`** (21%). Run §6.5 on
`reasoning` first; the clusters show which instruction patterns `rea-rules.mjs` still
misses. English/Quant/GA fallbacks are small (0 / 75 / 5).

---

## 9. When 2024 / 2023 papers are uploaded

The code currently assumes one year in two places:

1. `tools/tag-questions.mjs` → `const dir2025 = path.resolve("2025")` (hardcoded folder)
   and `q.meta.exam.year: 2025` (hardcoded literal).
2. `index.html` → the `iu` shift mapping uses `year: "2025"` and
   `folderPath: \`2025/${s.fileName}\``.

Do this, in order:

1. Put papers in `2024/` and `2023/` (same JSON shape as `2025/`; 100 questions per file,
   question numbers 1–100 in exam order).
2. In `tag-questions.mjs`: loop over years instead of one directory, e.g.
   `for (const year of ["2023","2024","2025"])`, read `path.resolve(year)`, and set
   `q.meta.exam.year = Number(year)` plus `year` in each `shiftRegistry` entry.
   Keep mock numbering global and stable (M1..Mn ordering matters to the UI keys).
3. In `index.html`: replace the hardcoded `year: "2025"` / `folderPath: \`2025/...\`` with
   `s.year` and `` `${s.year}/${s.fileName}` ``.
4. Re-run the whole pipeline (§3), then run §6.1 and §6.2.
5. **Expected results per year**: `1125 × years` total, 1125 per subject per year,
   orphans 0, and each subject's biggest bucket should stay under ~30%.
6. Spot-check one full shift per subject per year (§6.4). Do not trust counts alone —
   an even distribution can still be evenly wrong.
7. If a new instruction pattern appears (new years often add formats), extend the
   relevant `*-rules.mjs`, re-run, and re-check the fallback counts. Never map a new
   format into a "close enough" existing bucket — add a micro-topic if nothing fits,
   with an honest fallback for the rest.
8. `index.html` hardcodes "45 shifts"/"24 sets" style strings in a few places; after
   adding years, search for them and make them derive from the index.

---

## 10. Timetable tab

- Source of truth: `tools/timetable.txt`, one line per day:
  `Monday: 10:00-11:30 Reasoning, 11:30-12:00 Break, ...`
  Labels are free text; subject matching is alias-based (`Reasoning`, `Quant`,
  `English`, `General Awareness`; also `GA`, `GS`, `GK`, `Maths`).
- `python tools/analyze_timetable.py` writes `timetable-data.js` and prints a per-day
  table plus a coverage check. `Problems: none` is the pass condition.
- `timetable.js` renders an overlay ("🗓️ Timetable" tab in the header) with:
  7 day columns × 4 subject rows (time blocks + totals), a daily load row,
  a "priority day per subject" table, weekly-hour pills, and batch chips.
- Batches: `GROUPS` in `analyze_timetable.py` maps `"2025" → 2025-08-18` and
  `"2026" → 2026-08-17` (Mondays) and produces that batch's calendar dates. Both batches
  share one grid; add a third entry there if a new cohort appears.
- To change the schedule: edit `tools/timetable.txt`, run the python script, done —
  never hand-edit `timetable-data.js`.
- To add a subject: add it to `SUBJECTS` + `ALIASES` in `analyze_timetable.py` and to
  `SUBJECTS` in `timetable.js` (name/code/colour), then re-run.
- The overlay opens via `window.zzShowTimetable()`; the header button also calls
  `Vt("time")` so the tab looks active. Escape / backdrop closes it.
- `window.zzBuildTimetableHTML("2025"|"2026")` is exposed for headless testing.

---

## 11. File audit (verified 7 Nov 2026)

**Needed**

| File | Why |
| --- | --- |
| `index.html` | The app (427 KB compiled bundle). |
| `tags-index-compact.js` | Loaded by `index.html`; `window.SSC_TAGS_INDEX`. |
| `tags-index.json` | Build intermediate: feeds `generate-compact-index.mjs`; also the audit target. |
| `taxonomy.json` | Build intermediate: read by `taxonomy-rules.mjs` and `tag-questions.mjs`. |
| `tagging-report.md` | Generated audit report (rewritten each tagging run). |
| `timetable.js`, `timetable-data.js` | Timetable tab (generated data + renderer). |
| `SSC_CGL_Progress_2026-11-04.json` | User's exported study progress (2400 entries, 2 attempted). Backup, not auto-loaded. |
| `testbook extract command.txt` | The bookmarklet that produces new paper JSON — required for 2024/2023 uploads. |
| `TAGGING_PLAN.txt` | Historical design plan (superseded by this file, kept for context). |
| `2025/` | 90 files: 45 JSON + 45 HTML, all pairs matched. Source data. |
| `tools/*-rules.mjs`, `taxonomy-rules.mjs`, `build-taxonomy.mjs`, `tag-questions.mjs`, `generate-compact-index.mjs` | Live pipeline. |
| `tools/merge-explanation-html.mjs` | Needed when new HTML papers arrive (merges `explanation_html` into JSON). |
| `tools/timetable.txt`, `tools/analyze_timetable.py` | Timetable source + generator. |

**Removed on 7 Nov 2026** — nothing referenced any of it, and the app was verified unchanged.

| Removed | Size | Why it was dead |
| --- | --- | --- |
| `katex/` | 0.5 MB | `index.html` loads KaTeX 0.16.9 from `cdn.jsdelivr.net`; no local path was ever requested. |
| `index.html.bak` | 412 KB | Backup read only by the three obsolete patch scripts. |
| `tools/apply-full-tagging.mjs` | 16.3 KB | One-time UI patch, already applied inside `index.html`. |
| `tools/apply-tagging-ui.mjs` | 10.6 KB | Same. |
| `tools/patch-index.mjs` | 18.7 KB | Same. |
| `tools/build-questions-bank.mjs` | 3.8 KB | Wrote `questions-data.js`, which no file loaded. |

`2023/` and `2024/` were deliberately kept: both are still empty and are the drop zones
for the next batches (§9). Delete them only if those years will never be added.

If offline math is ever needed again: re-download KaTeX 0.16.9 into `katex/` and swap the
two CDN URLs in `index.html` for `katex/katex.min.css` and `katex/katex.min.js`.

---

## 12. Definition of done (use this as the checklist)

- [ ] Pipeline ran clean; 4500 (or `1125 × years`) processed.
- [ ] Each subject has exactly the expected question count.
- [ ] Orphans = 0.
- [ ] No subject's biggest micro-bucket is absurd (say > 30%); fallback buckets small
      and explicable.
- [ ] Duplicate-key audit clean in every rules file.
- [ ] One full shift per subject spot-checked against stems.
- [ ] `node --check` passes on each `tools/*-rules.mjs` and on the extracted bundle.
- [ ] Timetable: `Problems: none`, all four subjects covered, 7/7 days rendered.
- [ ] Told the user to hard-reload (`Ctrl+F5`).
