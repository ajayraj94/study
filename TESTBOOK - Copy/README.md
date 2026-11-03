# SSC Question Bank

Two files, one workflow:

| File | Purpose |
|------|---------|
| `SSC Question Bank Template.html` | Empty, reusable template. No questions baked in. Safe to edit — the build never writes to it. |
| `SSC Question Bank.html` | Generated standalone. Contains every paper found in the year folders. Rebuilt by the script, so edit the template instead of this file. |
| `build_dataset.js` | Reads the template, scans the year folders and writes the standalone. |

Open either HTML file by double-clicking — no server needed. Without data, the
template shows its **📂 Load Questions** button; the standalone opens the full bank.

## What is baked in now

| Year | Papers | Questions |
|------|--------|-----------|
| 2025 | 24     | 2,400     |

The bank can be browsed four ways, all combinable:

- **Year** — from the year folder (`2025`, and whatever you add next)
- **Exam** — from the paper title (`SSC CGL`, …)
- **Section** — Reasoning, General Awareness, Quantitative Aptitude, English
- **Chapter** — auto-classified topic inside the section

"Mock Type" shows one card per paper (timed test / practice). "Type Wise" opens
with one card per section (all four fit in the bird's-eye view); clicking a
section shows its chapters. Answers and solutions appear after you pick or reveal.

## Adding 2024, 2023, 2026 …

1. Create a folder named after the year (`2024/`).
2. Drop the exam JSON files in it — the same format as `2025/`:
   `{ "test_title": "...", "questions": [{ "number", "section", "question",
   "options", "correct_option", "solution", ... }] }`
3. Run the build:

   ```bash
   node build_dataset.js
   ```

4. Refresh `SSC Question Bank.html`.

The script scans **every** four-digit folder next to it, so future folders are
picked up with no code change. It replaces the data in the standalone only; the
template always stays empty. Browser-side marks/notes live in the page's
RAM/sync file and are unaffected by a rebuild.

## Chapter classification

The source papers only carry a section, not a chapter, so the build classifies
each question with keyword rules (`CHAPTER_RULES` in `build_dataset.js`).
Anything unmatched lands in a `… Misc` chapter.

To correct a chapter, you can:

- add `"chapter": "Time & Work"` to a question in its JSON (wins over rules), or
- create `2025/chapters.json` mapping question ids to chapters:
  `{ "6901f8b14d79a5a4a1ddefd0": "Analogy" }`

Then rebuild.

## Other files

- `Speed Ranker_Eng.html` — original template, left untouched
- `2025/` — source paper JSON + per-paper HTML exports

KaTeX is loaded from a CDN for formula rendering; without internet the page
still works and shows readable plain-text maths.
