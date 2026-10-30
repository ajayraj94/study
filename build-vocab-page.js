/* Build "Doubtful Vocab.html": the Speed Ranker template with the vocab notes baked in.
   MCQ text/options are English only (SSC CGL); the word card under them (revealed once the
   answer is in) carries the Hindi gloss, definition, example and mnemonic from the notes.
   Second mode = word cloud of every word (replaces the maths "column wise" view).
     mock  = Section number      topic = "Section N"      sub = "Column M"
   Re-run after editing "doubtful vocab.md":   node build-vocab-page.js */
const fs = require("fs");

const MD_FILE = "doubtful vocab.md";
const TPL_FILE = "Speed Ranker Template.html";
const OUT_FILE = "Doubtful Vocab.html";

/* ---------------- 1. parse the markdown ---------------- */
const md = fs.readFileSync(MD_FILE, "utf8").replace(/\r\n/g, "\n").split("\n");

const entries = [];
let section = 0;
let column = 0;
let cur = null;

const ENTRY_RE = /^\*\*\s*\d*\s*\.?\s*([^*—]+?)\s*—\s*([^*]*?)\s*\*\*\s*(?:·\s*(.*))?$/;

function flush() {
    if (cur) {
        entries.push(cur);
        cur = null;
    }
}

md.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const sec = line.match(/^#\s*Section\s*(\d+)\s*$/);
    if (sec) { flush(); section = Number(sec[1]); column = 0; return; }

    const col = line.match(/^##\s*Section\s*(\d+)\s*·\s*Column\s*(\d+)\s*$/);
    if (col) { flush(); section = Number(col[1]); column = Number(col[2]); return; }

    const m = line.match(ENTRY_RE);
    if (m) {
        flush();
        cur = {
            word: m[1].trim(),
            hindi: m[2].trim(),
            def: (m[3] || "").trim(),
            mnemonic: "",
            example: "",
            section: section,
            column: column
        };
        return;
    }
    if (!cur) return;
    if (/^🧠/.test(line)) cur.mnemonic = line.replace(/^🧠\s*/, "").trim();
    else if (/^🗣️/.test(line)) cur.example = line.replace(/^🗣️\s*/, "").trim();
});
flush();

const broken = entries.filter(e => !e.word || !e.hindi || !e.section || !e.column);
if (broken.length) {
    console.error("⚠️  entries with a missing word/meaning/section:", broken.slice(0, 5));
    process.exit(1);
}

/* ---------------- 2. English-only helpers ---------------- */
function englishOnly(raw) {
    return String(raw)
        .replace(/[\u0900-\u097F]+(?:[\s\-–—/,.()]+[\u0900-\u097F]+)*/g, " ")
        .replace(/\(\s*\)|\[\s*\]/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/^[\s\-–—:;,.→]+/, "")
        .replace(/[\s\-–—:;,]+$/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}
function englishExample(raw) {
    return englishOnly(String(raw).split("·")[0]);
}
function hindiExample(raw) {
    const parts = String(raw).split("·");
    return parts.length > 1 ? parts.slice(1).join("·").trim() : "";
}

/* one card per word (the notes repeat "Stout"): keep the first */
const seen = new Set();
const words = [];
for (const e of entries) {
    e.meaning = englishOnly(e.def || e.hindi);
    const key = e.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(e);
}

/* ---------------- 3. build the multiple-choice questions ---------------- */
function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const byColumn = new Map();
const bySection = new Map();
for (const w of words) {
    const ck = w.section + "-" + w.column;
    if (!byColumn.has(ck)) byColumn.set(ck, []);
    byColumn.get(ck).push(w);
    if (!bySection.has(w.section)) bySection.set(w.section, []);
    bySection.get(w.section).push(w);
}

function pickDistractors(w, count) {
    const pools = [
        byColumn.get(w.section + "-" + w.column) || [],
        bySection.get(w.section) || [],
        words
    ];
    const out = [];
    const used = new Set([w.meaning]);
    for (const pool of pools) {
        const shuffled = pool.slice().sort((a, b) => hash(a.word) - hash(b.word));
        for (const o of shuffled) {
            if (out.length >= count) break;
            if (!o.meaning || used.has(o.meaning)) continue;
            used.add(o.meaning);
            out.push(o);
        }
        if (out.length >= count) break;
    }
    return out;
}

const LETTERS = ["A", "B", "C", "D"];
const qnumOf = new Map();
let skipped = 0;
const questions = [];

for (const w of words) {
    const correct = w.meaning;
    if (!correct) { skipped++; continue; }
    const distractors = pickDistractors(w, 3);
    if (distractors.length < 3) { skipped++; continue; }

    const qnum = (qnumOf.get(w.section) || 0) + 1;
    qnumOf.set(w.section, qnum);

    const optionTexts = [correct, ...distractors.map(d => d.meaning)];
    const rand = rng(hash(w.section + ":" + w.column + ":" + w.word));
    for (let i = optionTexts.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [optionTexts[i], optionTexts[j]] = [optionTexts[j], optionTexts[i]];
    }

    questions.push({
        id: "s" + w.section + "c" + w.column + "-" + String(qnum).padStart(3, "0"),
        mock: w.section,
        qnum,
        text: "Select the most appropriate meaning of the given word: " + w.word,
        opts: { A: optionTexts[0], B: optionTexts[1], C: optionTexts[2], D: optionTexts[3] },
        ans: LETTERS[optionTexts.indexOf(correct)],
        topic: "Section " + w.section,
        sub: "Column " + w.column,
        /* the card under the options, revealed once the answer is in */
        word: w.word,
        hin: w.hindi,
        def: englishOnly(w.def),
        exEn: englishExample(w.example),
        exHi: hindiExample(w.example),
        mnem: w.mnemonic
    });
}

const sectionCount = new Set(questions.map(q => q.mock)).size;

/* ---------------- 4. patch the template ---------------- */
let html = fs.readFileSync(TPL_FILE, "utf8");
let edits = 0;

function replaceOnce(from, to) {
    const n = html.split(from).length - 1;
    if (n !== 1) throw new Error("expected exactly 1 match, found " + n + " for: " + from.slice(0, 70));
    html = html.replace(from, to);
    edits++;
}

replaceOnce("<title>Speed Ranker — Mock &amp; Type-wise Question Bank</title>", "<title>Speed Ranker — Doubtful Vocab</title>");
replaceOnce("<h1>🦅 Speed Ranker — Question Bank</h1>", "<h1>🦅 Speed Ranker — Doubtful Vocab</h1>");
replaceOnce('<span class="mode-label">Mock Type</span>', '<span class="mode-label">Section Wise</span>');
replaceOnce('<span class="mode-sub">47 timed sets</span>', '<span class="mode-sub">' + sectionCount + " timed sets</span>");
replaceOnce('<span class="mode-label">Type Wise</span>', '<span class="mode-label">Word Cloud</span>');
replaceOnce('<span class="mode-sub">by maths topic</span>', '<span class="mode-sub">all ' + questions.length + " words</span>");

/* topics = sections of the notes */
const TOPIC_ICONS = ["🔤", "📖", "✍️", "🗣️", "🧩", "🏛️"];
const TOPIC_COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#ea580c", "#16a34a", "#db2777"];
const topicLines = Array.from({ length: sectionCount }, (_, i) =>
    '    { name: "Section ' + (i + 1) + '", icon: "' + TOPIC_ICONS[i % TOPIC_ICONS.length] +
    '", color: "' + TOPIC_COLORS[i % TOPIC_COLORS.length] + '" }'
).join(",\n");
const oldTopics = /const TOPICS = \[[\s\S]*?\n\];/.exec(html);
if (!oldTopics) throw new Error("TOPICS array not found");
html = html.replace(oldTopics[0], "const TOPICS = [\n" + topicLines + "\n];");
edits++;

/* bake the questions in */
const baked = questions.map(q => "    " + JSON.stringify(q)).join(",\n");
replaceOnce("let QDATA = [];", "let QDATA = [\n" + baked + "\n];");

/* search reaches the meaning, gloss and mnemonic too */
replaceOnce(
    '(q.text + " " + Object.values(q.opts).join(" ") + " " + q.topic + " " + q.sub).toLowerCase()',
    '(q.text + " " + Object.values(q.opts).join(" ") + " " + q.topic + " " + q.sub + " " +\r\n' +
    '            (q.def || "") + " " + (q.hin || "") + " " + (q.mnem || "")).toLowerCase()'
);

/* ---- the word card, drawn to match the mockup ---- */
replaceOnce(
    "    .modal-count { font-size: 11.5px; color: #64748b; margin-left: 8px; font-weight: 600; }",
    "    /* ---- vocab card ---- */\r\n" +
    "    .vc { margin-bottom: 14px; }\r\n" +
    "    .vc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }\r\n" +
    "    .vc-word { font-size: 20px; font-weight: 800; color: #d81b60; margin: 0; letter-spacing: .1px; }\r\n" +
    "    .vc-ask { font-size: 12.5px; color: #64748b; font-weight: 600; font-style: italic; }\r\n" +
    "    .vc-edit {\r\n" +
    "        flex: none; display: inline-flex; align-items: center; gap: 5px;\r\n" +
    "        padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 999px;\r\n" +
    "        background: #fff; color: #475569; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;\r\n" +
    "    }\r\n" +
    "    .vc-edit:hover { background: #f8fafc; }\r\n" +
    "    .vc-hin { font-size: 15px; font-weight: 700; color: #111827; margin: -2px 0 10px; }\r\n" +
    "    .vc-panel {\r\n" +
    "        background: #f5f2fb; border-left: 4px solid #d81b60;\r\n" +
    "        border-radius: 6px; padding: 12px 14px;\r\n" +
    "    }\r\n" +
    "    .vc-def { font-size: 13.5px; line-height: 1.7; color: #1f2937; }\r\n" +
    "    .vc-ex { margin-top: 13px; font-size: 13.5px; line-height: 1.65; color: #1f2937; }\r\n" +
    "    .vc-exhi { margin-top: 6px; font-size: 13px; line-height: 1.6; color: #6b7280; }\r\n" +
    "    .vc-hint {\r\n" +
    "        display: inline-block; margin-top: 12px; padding: 8px 12px; border-radius: 8px;\r\n" +
    "        background: #fce7f0; border: 1px solid #f6bfd8; color: #7a1039;\r\n" +
    "        font-size: 12.5px; line-height: 1.55; font-weight: 600;\r\n" +
    "    }\r\n" +
    "    .modal-count { font-size: 11.5px; color: #64748b; margin-left: 8px; font-weight: 600; }"
);
replaceOnce(
    '    html[data-theme="dark"] .ans-line { background: #052e1b; border-color: #166534; color: #86efac; }',
    '    html[data-theme="dark"] .ans-line { background: #052e1b; border-color: #166534; color: #86efac; }\r\n' +
    '    html[data-theme="dark"] .vc-word { color: #f472b6; }\r\n' +
    '    html[data-theme="dark"] .vc-edit { background: #162136; border-color: #33465f; color: #cbd5e1; }\r\n' +
    '    html[data-theme="dark"] .vc-hin { color: #e8eef8; }\r\n' +
    '    html[data-theme="dark"] .vc-panel { background: #221a33; border-left-color: #f472b6; }\r\n' +
    '    html[data-theme="dark"] .vc-def, html[data-theme="dark"] .vc-ex { color: #dbe4f0; }\r\n' +
    '    html[data-theme="dark"] .vc-exhi { color: #94a3b8; }\r\n' +
    '    html[data-theme="dark"] .vc-hint { background: #33131f; border-color: #7a2c48; color: #f9c2d8; }'
);

/* the card renderer + the inline note box, dropped in just above renderModal() */
replaceOnce(
    "function renderModal(keepScroll) {",
    "/* ---- vocab card: word first, the notes only once the answer is in ---- */\r\n" +    "function vocabStemHtml(q, answered) {\r\n" +
    "    const word = esc(q.word || q.text);\r\n" +
    "    if (!answered) {\r\n" +
    "        return '<div class=\"vc\"><div class=\"vc-head\"><h2 class=\"vc-word\">' + word + '</h2>' +\r\n" +
    "            '<span class=\"vc-ask\">Select the most appropriate meaning</span></div></div>';\r\n" +
    "    }\r\n" +
    "    const body = [];\r\n" +
    "    if (q.hin) body.push('<div class=\"vc-hin\">' + mathHtml(q.hin) + '</div>');\r\n" +
    "    if (q.def) body.push('<div class=\"vc-panel\"><div class=\"vc-def\">' + mathHtml(q.def) + '</div></div>');\r\n" +
    "    if (q.exEn) body.push('<div class=\"vc-ex\">🗣️ ' + mathHtml(q.exEn) + '</div>');\r\n" +
    "    if (q.exHi) body.push('<div class=\"vc-exhi\">' + mathHtml(q.exHi) + '</div>');\r\n" +
    "    if (q.mnem) body.push('<div class=\"vc-hint\">🧠 ' + mathHtml(q.mnem) + '</div>');\r\n" +
    "    return '<div class=\"vc\">' +\r\n" +
    "        '<div class=\"vc-head\"><h2 class=\"vc-word\">' + word + '</h2>' +\r\n" +
    "        '<button type=\"button\" class=\"vc-edit\" onclick=\"toggleQFlag(\\'edited\\')\" ' +\r\n" +
    "        'title=\"Mark this word as corrected\">✏️ Edit</button></div>' +\r\n" +
    "        body.join(\"\") + '</div>';\r\n" +
    "}\r\n" +    "function renderModal(keepScroll) {"
);

replaceOnce(
    "        '<div class=\"q-stem\">' + mathHtml(q.text) + '</div>' +\r\n        opts + answerLine;",
    "        vocabStemHtml(q, answered) +\r\n        opts + answerLine;"
);

/* ---- word cloud view (second mode) ---- */
replaceOnce(
    "    .modal-count { font-size: 11.5px; color: #64748b; margin-left: 8px; font-weight: 600; }",
    "    /* ---- word cloud ---- */\r\n" +
    "    .word-cloud {\r\n" +
    "        display: flex; flex-wrap: wrap; gap: 0 11px; align-content: flex-start;\r\n" +
    "        grid-column: 1 / -1; padding: 8px 12px; background: #fff;\r\n" +
    "        border: 1px solid #e2e8f0; border-radius: 12px;\r\n" +
    "        font-family: \"Segoe UI\", Calibri, Candara, \"Trebuchet MS\", sans-serif;\r\n" +
    "    }\r\n" +
    "    .cloud-word {\r\n" +
    "        border: 0; background: none; padding: 0; margin: 0;\r\n" +
    "        font-family: inherit; font-size: 17px; font-weight: 400; line-height: 1.15;\r\n" +
    "        cursor: pointer;\r\n" +
    "    }\r\n" +
    "    .cloud-word:hover { text-decoration: underline; }\r\n" +
    "    .cloud-word.has-note::after { content: \" ✎\"; font-size: 11px; opacity: .75; }\r\n" +
    "    .cloud-count { grid-column: 1 / -1; margin: 10px 2px 0; font-size: 12.5px; color: #64748b; font-weight: 600; }\r\n" +
    "    .modal-count { font-size: 11.5px; color: #64748b; margin-left: 8px; font-weight: 600; }"
);
replaceOnce(
    '    html[data-theme="dark"] .ans-line { background: #052e1b; border-color: #166534; color: #86efac; }',
    '    html[data-theme="dark"] .ans-line { background: #052e1b; border-color: #166534; color: #86efac; }\r\n' +
    '    html[data-theme="dark"] .word-cloud { background: #0f1a2b; border-color: #27374f; }\r\n' +
    '    html[data-theme="dark"] .cloud-count { color: #94a3b8; }'
);

replaceOnce(
    "    if (state.mode === \"mock\") {\r\n        if (state.mock != null) {",
    "    if (state.mode === \"type\") {\r\n" +
    "        /* word cloud replaces the maths column view: every filtered word, one click away */\r\n" +
    "        title.textContent = state.topic ? state.topic + (state.sub ? \" › \" + state.sub : \"\") + \" · words\" : \"Word Cloud\";\r\n" +
    "        meta.textContent = shown.length + \" of \" + QDATA.length + \" words\";\r\n" +
    "        renderWordCloud(grid, shown);\r\n" +
    "        return;\r\n" +
    "    }\r\n\r\n" +
    "    if (state.mode === \"mock\") {\r\n        if (state.mock != null) {"
);
replaceOnce(
    "function renderWorkspace() {",
    "function renderWordCloud(grid, items) {\r\n" +
    "    const cloud = document.createElement(\"div\");\r\n" +
    "    cloud.className = \"word-cloud\";\r\n" +
    "    /* shuffle so the section colours interleave instead of stacking in blocks */\r\n" +
    "    const order = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };\r\n" +
    "    items.slice().sort((a, b) => order(a.id) - order(b.id)).forEach(q => {\r\n" +
    "        const btn = document.createElement(\"button\");\r\n" +
    "        btn.type = \"button\";\r\n" +
    "        btn.className = \"cloud-word\";\r\n" +
    "        btn.dataset.id = q.id;\r\n" +
    "        btn.dataset.groupKey = groupKeyOf(q);\r\n" +
    "        const meta = TOPIC_META[q.topic];\r\n" +
    "        if (meta) btn.style.color = meta.color;\r\n" +
    "        btn.textContent = q.word || q.text;\r\n" +
    "        btn.title = q.word + \" — \" + formatMath(q.opts[q.ans]);\r\n" +
    "        if (hasNote(q.id)) btn.classList.add(\"has-note\");\r\n" +
    "        cloud.appendChild(btn);\r\n" +
    "    });\r\n" +
    "    grid.appendChild(cloud);\r\n" +
    "    const count = document.createElement(\"div\");\r\n" +
    "    count.className = \"cloud-count\";\r\n" +
    "    count.textContent = items.length + \" / \" + QDATA.length + \" words (filtered)\";\r\n" +
    "    grid.appendChild(count);\r\n" +
    "}\r\n" +
    "function renderWorkspace() {"
);
replaceOnce(
    '        const tile = e.target.closest(".rule-btn");',
    '        const tile = e.target.closest(".rule-btn, .cloud-word");'
);
replaceOnce(
    ': "Pick a topic, then drill into its sub-types.";',
    ': "Every word in one place — click a word to open its card.";'
);
replaceOnce('"🦅 View All Topics"', '"🦅 View All Words"');

/* narrower popup: same type sizes, less width to read across */
replaceOnce(
    "            width: 100%;\r\n            max-width: 900px;",
    "            width: 100%;\r\n            max-width: 760px;"
);

/* ---- View All deck: the cloud walks all 638 words, so the counter reads x / 638 ---- */
replaceOnce(
    '    modalDeck = (!groupKey || groupKey === "sel") ? base : base.filter(q => groupKeyOf(q) === groupKey);',
    '    modalDeck = (groupKey === "cloud" || !groupKey || groupKey === "sel")\r\n' +
    '        ? base\r\n' +
    '        : base.filter(q => groupKeyOf(q) === groupKey);'
);
replaceOnce(
    '        const tile = e.target.closest(".rule-btn, .cloud-word");',
    '        const tile = e.target.closest(".rule-btn, .cloud-word");'
);
replaceOnce(
    '        openModal(tile.dataset.id, tile.dataset.groupKey);',
    '        openModal(tile.dataset.id, tile.classList.contains("cloud-word") ? "cloud" : tile.dataset.groupKey);'
);

/* ---- resume: remember the last word opened, and where to jump back ---- */
replaceOnce(
    "let modalRevealed = false;",
    "let modalRevealed = false;\r\nlet lastStudied = null;   /* { id, word, at } — where study stopped */"
);
replaceOnce(
    "    if (modalIdx < 0) { modalDeck = [QDATA.find(q => q.id === id)]; modalIdx = 0; }",
    "    if (modalIdx < 0) { modalDeck = [QDATA.find(q => q.id === id)]; modalIdx = 0; }\r\n" +
    "    const opened = currentQ();\r\n" +
    "    if (opened) lastStudied = { id: opened.id, word: opened.word || opened.text, at: Date.now() };\r\n" +
    "    markResume();"
);
replaceOnce(
    "function renderModal(keepScroll) {",
    "/* ---- the Continue pill: where you stopped last time ---- */\r\n" +
    "function markResume() {\r\n" +
    "    const host = document.querySelector(\".filter-toolbar .ft-actions\");\r\n" +
    "    if (!host) return;\r\n" +
    "    let btn = document.getElementById(\"resumeBtn\");\r\n" +
    "    if (!btn) {\r\n" +
    "        btn = document.createElement(\"button\");\r\n" +
    "        btn.id = \"resumeBtn\";\r\n" +
    "        btn.className = \"review-due-btn\";\r\n" +
    "        btn.style.display = \"none\";\r\n" +
    "        host.insertBefore(btn, host.firstChild);\r\n" +
    "    }\r\n" +
    "    if (!lastStudied) { btn.style.display = \"none\"; }\r\n" +
    "    else {\r\n" +
    "        btn.style.display = \"\";\r\n" +
    "        btn.textContent = \"▶ Continue: \" + lastStudied.word;\r\n" +
    "        btn.title = \"Where you stopped last time — \" + lastStudied.word;\r\n" +
    "        btn.onclick = () => openModal(lastStudied.id, \"cloud\");\r\n" +
    "    }\r\n" +
    "    /* the cloud marks the same word, without waiting for a full render */\r\n" +
    "    document.querySelectorAll(\".cloud-word.is-last\").forEach(el => el.classList.remove(\"is-last\"));\r\n" +
    "    if (lastStudied) {\r\n" +
    "        const marked = document.querySelector(\".cloud-word[data-id='\" + lastStudied.id + \"']\");\r\n" +
    "        if (marked) marked.classList.add(\"is-last\");\r\n" +
    "    }\r\n" +
    "}\r\n" +
    "function renderModal(keepScroll) {"
);
replaceOnce(
    "    renderChips();\r\n    renderWorkspace();",
    "    renderChips();\r\n    renderWorkspace();\r\n    markResume();"
);
replaceOnce(
    "        if (hasNote(q.id)) btn.classList.add(\"has-note\");\r\n" +
    "        cloud.appendChild(btn);",
    "        if (hasNote(q.id)) btn.classList.add(\"has-note\");\r\n" +
    "        if (lastStudied && lastStudied.id === q.id) btn.classList.add(\"is-last\");\r\n" +
    "        cloud.appendChild(btn);"
);
replaceOnce(
    "    .cloud-word:hover { text-decoration: underline; }\r\n" +
    "    .cloud-word.has-note::after { content: \" ✎\"; font-size: 11px; opacity: .75; }\r\n",
    "    .cloud-word:hover { text-decoration: underline; }\r\n" +
    "    .cloud-word.is-last { text-decoration: underline 2px dotted; text-underline-offset: 3px; }\r\n" +
    "    .cloud-word.has-note::after { content: \" ✎\"; font-size: 11px; opacity: .75; }\r\n"
);

/* the Continue position rides along with the Sync JSON, so it survives a reload there */
replaceOnce(
    "        data[KEY_NOTES] = {};",
    "        if (lastStudied) data[\"srqb_last_v1\"] = lastStudied;\r\n        data[KEY_NOTES] = {};"
);
replaceOnce(
    "        if (isObj(data[KEY_NOTES])) { notes = mergeInto(notes, data[KEY_NOTES]); touched++; }",
    "        if (isObj(data[\"srqb_last_v1\"]) && data[\"srqb_last_v1\"].id) {\r\n" +
    "            lastStudied = data[\"srqb_last_v1\"];\r\n" +
    "            markResume();\r\n" +
    "            touched++;\r\n" +
    "        }\r\n" +
    "        if (isObj(data[KEY_NOTES])) { notes = mergeInto(notes, data[KEY_NOTES]); touched++; }"
);

/* stale maths copy left in the template */
replaceOnce(
    "1,173 questions · 47 mocks · 5 topic groups",
    questions.length + " words · " + sectionCount + " sections · " + byColumn.size + " columns"
);
replaceOnce(
    'state.mode === "mock" ? "🦅 All 47 Mocks (timed sets)" : "🦅 5 Topic Groups";',
    'state.mode === "mock" ? "🦅 All " + mockList().length + " Sections (timed sets)" : "🦅 " + TOPIC_ORDER.length + " Sections";'
);
replaceOnce(
    "'<span class=\"mod-card-badge\">M' + m + '</span>'",
    "'<span class=\"mod-card-badge\">S' + m + '</span>'"
);
replaceOnce(
    "'<div class=\"mod-card-name\">Mock ' + m + ' · Video ' + m + '</div>'",
    "'<div class=\"mod-card-name\">Section ' + m + ' · ' + items.length + ' words</div>'"
);
replaceOnce(
    'document.getElementById("modalTag").textContent = "Mock " + q.mock + " · Q" + q.qnum;',
    'document.getElementById("modalTag").textContent = "Section " + q.mock + " · Q" + q.qnum;'
);
replaceOnce(
    "'<div class=\"exam-title\">🎯 Mock ' + test.mock + ' — Timed Test<span>'",
    "'<div class=\"exam-title\">🎯 Section ' + test.mock + ' — Timed Test<span>'"
);
replaceOnce(
    "test.items.length + ' questions · 15 min</span></div>'",
    "test.items.length + ' questions · ' + Math.round(setClock(test.items.length) / 60) + ' min</span></div>'"
);

/* a section is ~100 words: give each its own 20 s instead of a flat 15 min */
replaceOnce(
    "const TEST_SECONDS = 15 * 60;   // every mock runs on a 15-minute clock",
    "const TEST_SECONDS = 15 * 60;   // fallback clock; startTest() scales it to the set size"
);
replaceOnce(
    "function startTest(m) {",
    "/* ~20 s per question, clamped to 5–45 min so a huge section is still doable */\r\n" +
    "function setClock(n) { return Math.max(5 * 60, Math.min(45 * 60, n * 20)); }\r\n" +
    "function startTest(m) {"
);
replaceOnce("        duration: TEST_SECONDS,", "        duration: setClock(items.length),");
replaceOnce(
    "        endAt: Date.now() + TEST_SECONDS * 1000,",
    "        endAt: Date.now() + setClock(items.length) * 1000,"
);

fs.writeFileSync(OUT_FILE, html, "utf8");

const perSection = Array.from(bySection.entries()).map(([s, l]) => "S" + s + ":" + l.length).join("  ");
console.log("parsed entries:", entries.length, "-> questions:", questions.length, "(skipped:", skipped + ")");
console.log(perSection);
console.log("template edits:", edits, "-> wrote", OUT_FILE, (html.length / 1024).toFixed(0) + " KB");
