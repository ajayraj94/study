# Build Prompt — “Flags + SRS Review Board” (single HTML file)

Copy everything below into another coding agent. It is a complete, exact specification extracted from the working app `Speed Booster.html`. Where a number, formula or rule is given, implement it **exactly** — no rounding changes, no extra auto-mastery, no extra difficulty controls.

---

## 0. Deliverable and constraints

Build **one self-contained file**: `flags-srs.html`.

- Vanilla HTML + CSS + JavaScript (ES2020). No build step, no frameworks, no external CDN, no network calls. Opening the file must work offline.
- The file has two layers:
  - **Data layer (“backend”)**: question records, flag state machine, SRS scheduler, persistence, import/export. Pure functions + one store.
  - **UI layer (“frontend”)**: chip matrix, review drawer, footer controls, filters, counters.
- Persist everything in `localStorage` under `zz_flags_srs_v1` (auto-save on every mutation) **and** support JSON export/import using the exact schema in §5.
- Seed with 3 demo questions (M1-Q1…M1-Q3) so the page is usable immediately, and still allow loading a JSON question bank.
- No exam timer, no mock scoring, no chapter explorer. Scope = **flags + statuses + SRS only**.

---

## 1. Record model (exact)

Every question is keyed `M{mockNum}-Q{qNum}` (e.g. `M1-Q7`). A record is:

```js
{
  status: "learning",          // "learning" | "weak" | "mastered"
  diff: null,                  // null | "easy" | "good" | "hard"  — SRS-owned, never user-set
  prio: null,                  // null | "high" | "med" | "low"
  bookmark: false,             // boolean
  doubt: false,                // boolean
  due: false,                  // boolean (manual “needs review” flag, NOT a date)
  srsReps: 0,                  // integer
  srsIntervalDays: 0,          // integer days
  srsEase: 2.5,                // float
  srsNextReviewAt: null,       // epoch ms | null
  srsLastGrade: null,          // null | "again" | "hard" | "good" | "easy"
  lastAttemptedAt: null,       // epoch ms | null
  selectedOption: null,        // option index | null
  autoTag: null,               // null | "right" | "wrong" | "skipped"
  paceTag: null,               // null | "slow" | "fast"
  timeSpentSec: null           // number | null
}
```

Defaults above are literal. Never invent new fields; never rename any.

---

## 2. Status machine (exact)

`status` has exactly three values: `learning`, `weak`, `mastered`.

Rules, in priority order:

1. **Mastered is manual only.** Nothing else may set `mastered`: not a correct answer, not Easy difficulty, not SRS Easy, not mock submission, not import heuristics beyond an explicitly persisted `status:"mastered"`.
2. Choosing the **correct** option → `status = "learning"`, `autoTag = "right"`, `due` unchanged, `lastAttemptedAt = now`.
3. Choosing a **wrong** option → `status = "weak"`, `autoTag = "wrong"`, `due = true`, `lastAttemptedAt = now`.
4. On a non-mastered record, re-clicking the option that is already selected → deselect (mastered records never deselect by re-click; they follow rule 8): `selectedOption = null`, `status = "learning"`, `due = false`, `lastAttemptedAt = null`, `autoTag = null`, `paceTag = null`.
5. Mock submit, attempted + correct → `learning`, `due:false`, `autoTag:"right"`.
6. Mock submit, attempted + wrong → `weak`, `due:true`, `autoTag:"wrong"`.
7. Mock submit, unattempted → write **only** `{ autoTag:"skipped", paceTag:null, timeSpentSec:null }`; do not touch `status`/`due`/`diff`.
7b. Mock submission never demotes mastery: if the stored record was `mastered`, the merge result must be `status:"mastered"`, `diff:"easy"`, `doubt:false`, `autoTag = (incoming==="right" ? "right" : null)`, with `due` unchanged. (A mastered record answered correctly in a mock stays mastered; answered wrong it still stays mastered and never gets `autoTag:"wrong"`.)
8. If a record is already `mastered`, answering never changes status/diff: force `status:"mastered"`, `diff:"easy"`, `doubt:false`, `due:false`, set `autoTag:"right"` only when the answer is correct, otherwise keep `"right"` if it was already `"right"`, else `null`. **Never write `"wrong"` on a mastered record.**
9. **Mastered is toggled by clicking the Mastered chip itself.**
   - Not mastered → mastered: `status="mastered"`, `diff="easy"`, `doubt=false`, `autoTag = (autoTag==="right" ? "right" : null)`. `due` is **not** touched by mastering.
   - Already mastered → unmaster: `status="learning"`, `diff=null`, `due=false`. Everything unlocks. No separate deselect/unmaster button exists.
10. Importing/normalizing a mastered record always enforces: `diff="easy"`, `doubt=false`, `autoTag = (autoTag==="right" ? "right" : null)`; it does **not** touch `due`.

---

## 3. Flag / meta rules (exact)

Manual mutation entry point is `setMeta(field, value)` (the app calls it `fl`). It must implement exactly:

- `field === "diff"` → **ignored, always.** Difficulty is SRS-only. The footer Easy/Good/Hard chips are read-only indicators.
- Mastered lock, checked before anything else (after the unmaster toggle):
  - `status` change to anything except `mastered` → ignore.
  - `diff` change to anything except `easy` → ignore (and `diff` is ignored anyway per above).
  - `autoTag` change to anything except `right` → ignore.
  - `flag: doubt` → ignore.
  - Bookmark, paceTag and prio remain allowed.
  - Auto tag nuance: on a mastered record `right` is the only permitted value. Because autoTag is a toggle, clicking `Right` when it is already `right` clears it to `null`; clicking it when it is `null` (or legacy `wrong`/`skipped`) sets `right`. `Wrong` and `Skipped` are always no-ops while mastered.
- `status`: set the value; when it becomes `mastered`, also apply the mastered cleanup from §2.9.
- `autoTag`: same value toggles to `null`, otherwise set to the clicked value.
- `paceTag`: same value toggles to `null`, otherwise set.
- `flag: bookmark` → `bookmark = !bookmark`.
- `flag: doubt` → `doubt = !doubt` (blocked when mastered).
- `prio` → set `"high" | "med" | "low"` directly (no toggle; click a different one to change). Allowed even on mastered.

### Visual implications of the lock
- Mastered chip: green with a white `✓` before the question label and a `MASTERED` caption. Hide the Doubt, Wrong and Skipped markers entirely. Ignore legacy `good`/`hard` coloring even if the stored data says so.
- Mastered still shows the Bookmark `★` and the Right `✓` marker.
- Only `easy` may coexist with `mastered` as `diff`.

### Auto-skip tagging (exact)
When the user leaves a question without selecting an option (Prev, Next, closing the review drawer, review navigation):

```js
if (record.selectedOption == null && record.status !== "mastered") {
  record.autoTag = "skipped";   // leaves status, due, diff untouched
}
```

This is what produces skipped flags in bulk. It must never fire on a mastered record and never overwrite another autoTag.

---

## 4. SRS engine (exact — copy these formulas)

Grade keys are exactly `"again" | "hard" | "good" | "easy"`. `now = Date.now()`; one day = `86_400_000` ms; Again is `+10 * 60_000` ms.

Let `reps = srsReps || 0`, `interval = srsIntervalDays || 0`, `ease = srsEase || 2.5`.

### 4.1 Apply a grade (`applySrs`)

```
again:
  reps = 0
  interval = 0
  ease = max(1.3, ease - 0.2)
  nextReviewAt = now + 10 minutes
  status = "weak"; diff = "hard"; due = true

hard:
  interval = (reps === 0 || interval <= 1) ? 1 : max(2, round(interval * 1.2))
  reps = reps + 1
  ease = max(1.3, ease - 0.15)
  nextReviewAt = now + interval days
  status = "weak"; diff = "hard"; due = false

good:
  interval = reps === 0 ? 4 : reps === 1 ? 7 : max(4, round(interval * ease))
  reps = reps + 1
  ease unchanged
  nextReviewAt = now + interval days
  status = "learning"; diff = "good"; due = false

easy:
  base   = reps === 0 ? 4 : reps === 1 ? 7 : max(4, round(interval * ease))
  interval = reps === 0 ? 23 : max(14, round(base * 1.8))
  reps = reps + 1
  ease = ease + 0.15            // no upper clamp
  nextReviewAt = now + interval days
  status = (status === "mastered" ? "mastered" : "learning")
  diff = "easy"; due = false

always: srsLastGrade = grade; lastAttemptedAt = now
```

Notes that must be preserved:
- `hard` and `easy` compute the base interval from the **pre-increment** `reps`.
- `Math.round` is JavaScript rounding (`.5` up).
- `again` resets reps/interval but keeps `diff:"hard"`.
- Easy is the **only** SRS grade allowed while mastered (Again/Hard/Good buttons are disabled then); it keeps `status:"mastered"`.

### 4.2 Preview labels (`srsPreview`) — must match what the grade will produce

```
againLabel = local time string of (now + 10 minutes)     // e.g. "3:42 PM"
hardLabel  = (reps===0 || interval<=1) ? "Tomorrow"
             : "MMM D" of (now + max(2, round(interval*1.2)) days)
goodLabel  = "MMM D" of (now + (reps===0 ? 4 : reps===1 ? 7 : max(4, round(interval*ease))) days)
easyLabel  = "MMM D" of (now + (reps===0 ? 23
             : max(14, round((reps===1 ? 7 : max(4, round(interval*ease))) * 1.8))) days)
```

Date format: `toLocaleDateString("en-US", { month:"short", day:"numeric" })` → `Feb 8`. Time format: `toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })`.

### 4.3 Worked values (use these as unit tests)

| Start state | Grade | Result |
|---|---|---|
| `reps 0, int 0, ease 2.5` | again | reps 0, int 0, ease 2.3, weak/hard, due, +10 min |
| `reps 0, int 0, ease 2.5` | hard | reps 1, int 1, ease 2.35, weak/hard |
| `reps 0, int 0, ease 2.5` | good | reps 1, int 4, ease 2.5, learning/good |
| `reps 0, int 0, ease 2.5` | easy | reps 1, int **23**, ease 2.65, learning/easy |
| `reps 1, int 1, ease 2.5` | good | reps 2, int **7** |
| `reps 1, int 1, ease 2.5` | easy | reps 2, int **14** (base 7 → max(14, round(12.6)) = 14) |
| `reps 2, int 7, ease 2.5` | hard | reps 3, int 8, ease 2.35 |
| `reps 2, int 7, ease 2.5` | good | reps 3, int 18 |
| `reps 2, int 7, ease 2.5` | easy | reps 3, int **32** (round(18*1.8)=32) |
| `reps 1, int 1, ease 1.3` | again | reps 0, int 0, ease **1.3** (clamped), weak/hard, due |
| `mastered, diff easy` | easy | stays mastered, diff easy, due false |
| `mastered, diff easy` | good/hard/again | blocked by UI + guard, no change |

### 4.4 SRS rating UI text (exact strings)

After rating, show a toast:

```
again: 🔴 Again — Scheduled for {againLabel} (Marked Weak & Due)
hard:  🟠 Hard — Scheduled for {hardLabel} (Interval: {srsIntervalDays}d)
good:  🟢 Good — Scheduled for {goodLabel} (Interval: {srsIntervalDays}d)
easy:  🔵 Easy — Scheduled for {easyLabel} (Interval: {srsIntervalDays}d)
```

Status line in the footer:

- Not rated: `Not rated — no schedule yet`
- Rated: `Good — Scheduled for Feb 8 (Interval: 22d)` (interval part omitted when 0)
- Dot colors: again `#f87171`, hard `#fb923c`, good `#4ade80`, easy `#60a5fa`, none `#cbd5e1`.
- Rating buttons: Again / Hard / Good / Easy, active button = last grade; **disabled when `status === "mastered"` except Easy**.
- `Auto-next on rate` checkbox: when on, rating advances to the next question.

---

## 5. Persistence, export, import (exact)

### 5.1 Auto-save
Serialize `{ progress, mockResults, settings }` to `localStorage["zz_flags_srs_v1"]` after every change; restore on load. Corrupt JSON must fall back to empty state without throwing.

### 5.2 Export file
Filename `SSC_CGL_Progress_YYYY-MM-DD.json` (ISO date). Body:

```json
{
  "app": "SSC CGL Tier-1 Command Center",
  "version": "4.0-ram",
  "exportedAt": "2026-11-28T00:00:00.000Z",
  "marksScheme": { "plus": 2, "minus": 0.5 },
  "stats": { "attempted": 0, "weak": 0, "learning": 0, "mastered": 0, "due": 0,
             "bookmark": 0, "doubt": 0, "easy": 0, "good": 0, "hard": 0,
             "high": 0, "med": 0, "low": 0, "right": 0, "wrong": 0,
             "skipped": 0, "slow": 0, "fast": 0 },
  "progress": { "M1-Q1": { "...record fields...": "" } },
  "mockResults": {},
  "sprintDays": {},
  "customQuestionsCount": 0
}
```

`progress` keys must be `M{mock}-Q{n}` (normalize `1-2`, `M1_Q2`, `M 1 - Q 2` to that form). Unknown extra top-level keys are ignored on import.

### 5.3 Import normalization (tolerant, exact rules)
For each entry:
1. Resolve the question key from the object key, then `key | id | questionKey | qid | questionId`, then `mockNum|mock|shiftNum|mock_no` + `qNum|qnum|qNo|q_no|number`. Unresolvable → skip.
2. Start from the defaults in §1, then copy only the allow-listed fields: `status, diff, prio, bookmark, doubt, due, srsReps, srsIntervalDays, srsEase, srsNextReviewAt, srsLastGrade, lastAttemptedAt, selectedOption, autoTag, paceTag, timeSpentSec`.
3. Alias mapping:
   - `status`: `mastered|strong|done → mastered`, `weak|wrong → weak`, anything else truthy → `learning`.
   - `diff`: `tough|hard → hard`, `moderate|medium → good`, `easy → easy`.
   - `bookmark`: `bookmark | bm`; numbers coerce to boolean. `doubt` numbers coerce to boolean.
   - `prio` from `priority`.
   - Nested `sr: { n, due, rated, last }` → `srsReps = sr.n`, `srsNextReviewAt = sr.due`, `srsLastGrade = sr.rated`, `lastAttemptedAt = sr.last`, `srsIntervalDays = max(0, round((sr.due - sr.last)/86400000))` when missing.
   - Numeric `due` → `due = (value <= Date.now())`.
4. Post-normalize mastered records per §2.10.
5. Report: `✅ Read {n} question record(s) from that file into RAM!`

---

## 6. Frontend specification (exact)

### 6.1 Question chips (the matrix)
One chip per question, button element. Label inside: `{year} · M{yearMock}·Q{n} · T{globalMock}` when a year exists, otherwise `M{mock}·Q{n}`. Title text: `{shift|year} · {year ? "2024 Mock 3 of 12" : "Mock 3"} · Global T{globalMock} · Q{n}` + ` · Last SRS: {grade}` when rated.

Chip base CSS (**copy sizes**):
```
min-width:56px; padding:9px 12px; margin:5px; border-radius:8px;
border:1px solid var(--border-strong); background:var(--surface-subtle);
font-size:11px; font-weight:600; text-align:center;
position:relative; overflow:visible; transition:all .12s;
```
Hover: change border/background/text color **only**. Do **not** use `transform` — chips must not jump on hover.

State styles:
- `status === "weak"` → background rose, white bold.
- `status === "mastered"` → green background, white bold, `min-width:62px`, `padding-bottom:18px`, white inset ring, a `::before` white `✓` (12px/900), and a `::after` caption `MASTERED` (8px/900, letter-spacing .06em, centered 4px from the bottom). Mastered hides Doubt/Wrong/Skipped markers and wins over good/hard colors.
- `diff === "good"` (and not mastered) → background `#facc15`, border `#ca8a04`, text `#3f2d00`.
- `diff === "hard"` (and not mastered) → background `#ef4444`, border `#b91c1c`, white.
- `diff === "easy"` → default chip styling (no special fill).
- `autoTag === "skipped"` (and not mastered) → `min-width:70px; padding-bottom:20px; border:1px dashed #334155;` plus a full-width bottom band (`::after`) with `content:"SKIPPED"`, background `#334155`, color `#f8fafc`, 9px/900, letter-spacing .06em, padding 4px 0, radius `0 0 7px 7px`. There is **no** small skip icon badge — the word is the marker.
- `bookmark` → extra amber ring: `box-shadow:0 0 0 2px #f59e0b`.

Badges (15px circles, 1.5px white border, 9px/900, absolute, `z-index:2`):
- doubt: top -5px / left -5px, purple `#7c3aed`, `?`
- bookmark: top -5px / right -5px, amber `#f59e0b`, `★` (dark ink)
- right: bottom -5px / right -5px, green `#059669`, `✓`
- wrong: bottom -5px / right -5px, red `#e11d48`, `✕`
- skipped: **no badge** (see caption above)
- `right`/`wrong`/`skipped` are mutually exclusive; `bookmark` and `doubt` are independent.

### 6.2 Review drawer footer
Sections top to bottom, all inside a “stealth” wrapper:

1. **SRS row**: status dot + `Not rated — no schedule yet` / `Good — Scheduled for Feb 8 (Interval: 22d)`, then buttons `Again Hard Good Easy`, then `Auto-next on rate`, then `Stealth ON/OFF` (keyboard `S` dims this whole footer until hover).
2. **Difficulty row (read-only)**: chips `Easy`, `Good`, `Hard` with `disabled`, class `diff-readonly`, `title="Difficulty is set by SRS only"`, opacity ~0.75, `cursor:not-allowed`. Clicking them does nothing.
3. **Priority row**: `High`, `Med`, `Low` — clickable.
4. **Flags row**: `Doubt`, `Bookmark` — clickable (Doubt disabled on mastered).
5. **Auto tag row** (label: “Auto tag — set automatically when you answer or skip; click again to clear”): `Right`, `Wrong`, `Skipped`. On mastered: Right enabled, Wrong + Skipped disabled.
6. **Pace row**: `>60s` (slow), `<60s` (fast) — toggleable, allowed on mastered.
7. **Status row**: `Weak`, `Learning`, `Mastered`. Mastered is the toggle (click again to unmaster). On mastered: clicking Weak/Learning is a hard no-op (guard), clicking Mastered unmaster once. Mastered stays enabled because it is the unmaster action.
8. `← Prev` / `Next →` buttons below.

Chip component: button, `className = "exam-chip" + (active ? " active" : "") + (locked ? " diff-readonly" : "")`, `disabled` when locked, leading 9px dot whose color is: easy/mastered/low `#22c55e`; good/med `#eab308`; hard/weak/high `#ef4444`; learning/skipped `#94a3b8`; right `#22c55e`; wrong `#ef4444`; slow `#f97316`; fast `#0ea5e9`.

### 6.3 Counters (exact definitions over the loaded bank)
- `mastered`, `weak`, `learning` by status (anything not mastered/weak counts as learning).
- `attempted` = count of records whose status is `mastered` **or** `weak`.
- `due` = `due === true`; `bookmark`, `doubt` per flag.
- `easy/good/hard` by `diff`; `high/med/low` by `prio`.
- `right/wrong/skipped` by `autoTag`; `slow/fast` by `paceTag`.

### 6.4 Filters
Filter controls must support: status (`all | learning | weak | mastered`), flag (`bookmark | doubt | due`), autoTag (`right | wrong | skipped`), paceTag (`slow | fast`). Filters are AND-combined; a filtered chip click opens the drawer for that exact question.

---

## 7. Acceptance tests (must all pass exactly)

1. Fresh record, rate **Good** → `srsReps 1`, `srsIntervalDays 4`, `srsEase 2.5`, `status learning`, `diff good`, `due false`, `srsNextReviewAt ≈ now + 4d`, `srsLastGrade "good"`.
2. Fresh record, rate **Hard** twice → after 2nd: `reps 2`, `interval 1`, `ease 2.2`, `status weak`, `diff hard`.
3. Fresh record, rate **Easy** → `reps 1`, `interval 23`, `ease 2.65`, `status learning`, `diff easy`, preview label equals `now + 23d`.
4. **Again** on any non-mastered record → `reps 0`, `interval 0`, `ease = max(1.3, old-0.2)`, `weak/hard`, `due true`, next `now + 10min`.
5. Mastered record, rate **Easy** → stays `mastered`, `diff easy`, `due false`, reps increment.
6. Mastered record: Again / Hard / Good buttons disabled; clicking footer Weak / Learning / Wrong / Skipped / Doubt changes nothing. Clicking Right when it is already `right` clears it to `null` (documented toggle); clicking Right when null sets it.
7. Click **Mastered** once on a `weak + wrong + skipped + doubt` record → `mastered`, `diff easy`, `doubt false`, `autoTag null`; `due` is left exactly as it was (mastering never clears `due`).
8. Click **Mastered** again → `learning`, `diff null`, `due false`, all status/flag/SRS controls clickable again; the Easy/Good/Hard difficulty chips remain read-only as always.
9. Mastered record + correct answer → stays mastered, `autoTag right`, no `wrong` written.
10. Select wrong option → `weak`, `autoTag wrong`, `due true`. Re-click same option → `selectedOption null`, `learning`, `due false`, `autoTag null`, `lastAttemptedAt null`.
11. Leave an unanswered non-mastered question via Next → `autoTag "skipped"`, status and `due` unchanged.
12. Mastered question left unanswered → **no** skipped tag.
13. Import `{ status:"mastered", diff:"hard", doubt:true, autoTag:"skipped" }` → `mastered`, `diff easy`, `doubt false`, `autoTag null`.
14. Import older alias keys (`strong`, `tough`, `bm`, nested `sr`) → mapped per §5.3.
15. Footer Easy/Good/Hard chips are `disabled` with the exact tooltip; forced calls to `setMeta("diff", …)` are no-ops.
16. Hovering any chip changes only colors; nothing moves (no `transform`, no size change).
17. Counters match §6.3 on a mixed fixture.
18. Export → reload page → import the exported file → every field round-trips identically.

---

## 8. Explicit non-goals (must NOT be added)

- No automatic mastery under any path (answers, SRS Easy, mock, Easy difficulty).
- No difficulty buttons that actually set difficulty anywhere (footer, drawer, keyboard shortcut).
- No separate “Unmaster” / “Deselect” button.
- No skip icon beside `SKIPPED`; the caption is the marker.
- No new statuses, no extra grades, no “leech/suspend” behaviour, no decay of ease above 2.65 other than the formulas given.
- No hover lift/animation on chips.
