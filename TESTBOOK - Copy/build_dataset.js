/*
 * build_dataset.js — bake every year folder into the Speed Ranker template.
 *
 *   node build_dataset.js
 *
 * Drop any folder named like a year (2023/, 2024/, 2025/, 2026/ …) next to this
 * file, put the exam JSON exports inside it, run the command and open
 * "SSC Question Bank.html". Every *.json with a `questions` array is picked up,
 * so new years/folders need no code change.
 *
 * The HTML is split in two:
 *   "SSC Question Bank Template.html" — empty reusable template (never written to)
 *   "SSC Question Bank.html"          — generated standalone with all data baked in
 *
 * Question model used by the template:
 *   { id, qnum, text, opts, ans, sol, topic, sub, mock, year, exam }
 *   topic = section, sub = chapter (auto-classified, overridable)
 *
 * Chapters: a question may carry its own `chapter` / `topic` / `sub` field, a
 * year folder may contain chapters.json ({"<question id>": "<chapter>"}), and
 * anything still unknown goes through the keyword rules below.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TEMPLATE = path.join(ROOT, "SSC Question Bank Template.html");
const OUTPUT = path.join(ROOT, "SSC Question Bank.html");
const START = "/* >>> BAKED_DATASET_START >>> */";
const END = "/* <<< BAKED_DATASET_END <<< */";
const SKIP_FILES = new Set(["chapters.json", "chapter-overrides.json", "meta.json"]);

/* ------------------------------------------------------------------ chapters */
/* First matching rule wins; each section gets its own list. Add entries freely —
   a rule is [chapter name, regular expression]. */
const CHAPTER_RULES = {
  reasoning: [
    ["Address Matching", /\baddress(es)?\b|identical to the address|similar address|same as the one|exactly the same/i],
    ["Analogy", /analog|select the related|related (word|number|letter|pair)|similar relationship|::|is related to/i],
    ["Odd One Out", /odd one|classification|different from the (others|rest)|unlike the others|does not belong|does not follow|not follow the same/i],
    ["Coding-Decoding", /cod(e|ing)\b|coded (as|in)|code language|decode/i],
    ["Blood Relations", /blood relation|\b(brother|sister|father|mother|son|daughter|uncle|aunt|grandfather|grandmother|husband|wife|nephew|niece)\b/i],
    ["Direction & Distance", /\bdirection\b|\bnorth\b|\bsouth\b|\beast\b|\bwest\b|facing|turn(s|ed)? (left|right)/i],
    ["Order & Ranking", /\brank|position from the (left|right)|standing in a row|row of/i],
    ["Seating Arrangement", /seating|sitting arrangement|sits? (around|in a row|facing)/i],
    ["Syllogism", /syllogism|statements?\s*[:.]|conclusions?\s*[:.]|assumptions?\s*[:.]|course of action/i],
    ["Venn Diagram", /venn/i],
    ["Mathematical Operations", /mathematical operation|interchang|if\s*['"+\-*/]\s*.*\bmeans\b|symbols? (are|is) (interchanged|replaced)|given symbols mean|symbols? mean|['"]?\w['"]? denotes|then evaluate|if\s*\d+\s*\W+\s*\d+\s*=|if\s*\w\s*[%$#@]\s*\w\s*=|if\s*[+\-×x]\s*=|['"][^'"]{1,4}['"]\s*means/i],
    ["Mirror & Water Image", /mirror|water image/i],
    ["Paper Folding & Cutting", /paper (is )?(folded|cut)|folded|punch/i],
    ["Embedded Figures", /embedded|hidden (figure|in)/i],
    ["Counting Figures", /count the (number of )?(triangle|square|rectangle|circle|figure)/i],
    ["Dice & Cubes", /\bdice\b|\bcube\b/i],
    ["Clock & Calendar", /\bclock\b|calendar/i],
    ["Word Formation", /word (can be )?formed|word which cannot be formed|meaningful.{0,45}words?|letters? (are|can be) arranged|arrange.{0,20}letters/i],
    ["Alphabet Test", /alphabet|letter[- ]cluster|letter series/i],
    ["Number Series", /number series|series.{0,40}(missing|replace)|\b\d+\s*,\s*\d+\s*,\s*\d+/i],
    ["Figure Series", /figure (series|completion)|next figure|figure.{0,30}\?/i],
    ["Series", /series|replace the question mark/i],
    ["Statement & Conclusion", /statement|conclusion|inference|argument/i],
    ["Reasoning Misc", /./]
  ],
  quant: [
    ["Simplification", /simplif|evaluate|find the value|value of|is equal to|what is the result|find the sum/i],
    ["Fractions", /fraction/i],
    ["HCF & LCM", /\bhcf\b|\blcm\b|highest common|least common/i],
    ["Number System", /number system|remainder|unit digit|divisib|\bprime\b|factors?\b|rational|irrational|decimal/i],
    ["Percentage", /percent|%/i],
    ["Profit & Loss", /profit|\bloss\b|cost price|selling price|marked price/i],
    ["Discount", /discount/i],
    ["Simple Interest", /simple interest/i],
    ["Compound Interest", /compound interest/i],
    ["Ratio & Proportion", /ratio|proportion/i],
    ["Average", /average/i],
    ["Mixture & Alligation", /mixture|alligation|milk.{0,20}water/i],
    ["Partnership", /partner|invest(ed|ment)?|business|rent(ed|s)?\b|horses?/i],
    ["Pipes & Cisterns", /\bpipe|cistern|\btank\b|\btap\b/i],
    ["Time & Work", /\bwork\b|\bjob\b|efficien|complet(e|ing).{0,60}(job|work)|complete.{0,30}days|wages|\bmen\b.{0,20}\bdays\b/i],
    ["Boats & Streams", /\bboat|stream|upstream|downstream/i],
    ["Speed, Time & Distance", /\bspeed\b|distance|km\/h|m\/s|\btrain\b|travel/i],
    ["Mensuration", /\barea\b|perimeter|volume|surface|radius|diameter|circumference|cylinder|cone|sphere|hemisphere|cuboid|rectangular|rhombus|trapezium|sector|\barc\b/i],
    ["Geometry", /\bangle\b|triangle|\bcircle\b|chord|tangent|cyclic|centroid|incentre|circumcentre|orthocentre|polygon|parallel|bisector|median|altitude/i],
    ["Coordinate Geometry", /coordinate|slope|intercept|straight line|passes through|y\s*=\s*mx/i],
    ["Height & Distance", /height|elevation|depression|tower|ladder/i],
    ["Trigonometry", /\bsin|\bcos|\btan|\bcot|\bsec|cosec|trigonometr|radian|degree/i],
    ["Algebra", /algebra|polynomial|equation|\bx\s*[+\-*/=]|\ba\s*\+\s*b\b|quadratic/i],
    ["Data Interpretation", /bar graph|pie chart|line graph|table shows|data interpretation|\bgraph\b/i],
    ["Statistics", /median|\bmode\b|variance|standard deviation|frequency|\bmean\b/i],
    ["Probability", /probabil/i],
    ["Permutation & Combination", /permutation|combination|committee|arrangements?|ways can/i],
    ["Quantitative Aptitude Misc", /./]
  ],
  english: [
    ["Reading Comprehension", /read the (following )?passage|passage carefully|following passage|answer the following questions/i],
    ["Cloze Test", /words have been deleted|cloze test|fill in each blank|blank number|place of blank|blanks? (are|is) numbered/i],
    ["Error Detection", /part of the sentence that contains an error|incorrect part of the sentence|find the (incorrect|error)|spot the error|identify the (part|word).{0,60}(error|incorrect)|contains an error|error in the sentence|grammatical (or structural )?error/i],
    ["Sentence Improvement", /sentence improvement|improve the (sentence|underlined|bold)|best improves|correctly replaces the underlined|replaces? the underlin|most (appropriate|suitable) (option )?to (improve|replace)|most appropriate replacement|replace the (underlined|highlighted)/i],
    ["Active & Passive Voice", /passive voice|active voice|change the voice|(active|passive) (form|construction)|active to passive|passive to active|into (an? )?(active|passive)/i],
    ["Direct & Indirect Speech", /direct to indirect|indirect to direct|direct speech|indirect speech|reported speech|narration/i],
    ["Para Jumbles", /jumbled|para jumble|rearrange|arrange the (sentence )?parts|logical sequenc|correct sequence to form|parts \(P, ?Q|first and (the )?last parts/i],
    ["Idioms & Phrases", /idiom|idiomatic|phrase means|proverb|phrase.{0,40}refers to|highlighted (word|phrase)|phrasal verb/i],
    ["One Word Substitution", /one[- ]word (substitution|substitute|term)|can be substituted|substituted for|one word for|place (for|where).{0,50}called/i],
    ["Synonyms", /synonym|similar in meaning|same meaning|nearest in meaning|closest in meaning/i],
    ["Antonyms", /antonym|opposite in meaning|opposite meaning|most opposite|opposite of/i],
    ["Spellings", /correctly spelt|misspelt|misspelled|correct(ly)? spell|spelling|spell(ed|t)? (wrongly|incorrectly)/i],
    ["Homonyms", /homonym|homophone/i],
    ["Connectors", /connector|conjunction|linker/i],
    ["Fill in the Blanks", /fill in the blank|complete the sentence|blank|_+/i],
    ["English Misc", /./]
  ],
  ga: [
    ["Schemes & Policies", /policy|scheme|yojana|one nation one ration|vertical of|initiative/i],
    ["Current Affairs", /\b(202[3-9])\b.{0,80}(scheme|summit|conference|appointed|launched|held|award|championship|treaty|index|portal|festival|mission|yojana)|current affairs|recently|recent (report|index|summit|scheme)/i],
    ["History", /history|ancient|medieval|mughal|maurya|gupta|harappa|indus valley|battle|dynasty|freedom (struggle|fighter)|gandhi|revolution|colonial|vedic|ashoka|akbar/i],
    ["Polity", /constitution|article \d|amendment|parliament|lok sabha|rajya sabha|president|governor|judiciary|supreme court|chief justice|panchayat|fundamental rights|election commission|\bbill\b|sakshya|adhin(iyam|yam)|bharatiya|national emergency/i],
    ["Geography", /\briver\b|mountain|desert|\bsea\b|ocean|lake|climate|rainfall|soil|latitude|longitude|country|capital|continent|island|glacier|monsoon|mineral|glacial|landform|landslide|population/i],
    ["Economy", /econom|gdp|inflation|budget|\bbank\b|\brbi\b|\btax\b|\bgst\b|repo|fiscal|trade|export|import|investment|stock market/i],
    ["Science & Technology", /science|physics|chemistry|biology|\bcell\b|\batom\b|\bacid\b|\bbase\b|energy|\bforce\b|plant|animal|disease|vitamin|hormone|blood|organ|\bmetal\b|\bgas\b|light|sound|electric|magnet|newton|space|satellite|angular velocity|rigid body|argon|crust|enzyme|golgi|telomerase|organelle|copper|conduction|nisar|sslv|orbit/i],
    ["Art & Culture", /\bart\b|dance|music|festival|temple|sculpture|painting|classical|folk|theatre|architecture|literature|\bbook\b|author|poet|sarnath|lion capital/i],
    ["Sports", /sport|olympic|asiad|cricket|football|hockey|tennis|badminton|judo|wrestling|athletics|athlete|medal|tournament|\bcup\b|trophy|long jump|khelo india|chess|swimming|stadium/i],
    ["Awards & Honours", /award|padma|bharat ratna|nobel|oscar|prize|honour/i],
    ["Organisations", /united nations|unesco|\bwho\b|\bimf\b|world bank|\bwto\b|\bnato\b|saarc|brics|g20|asean|organisation|organization|commission|ministry/i],
    ["Important Days", /day (is|was) celebrated|world .{0,20}day|international .{0,20}day|national .{0,20}day/i],
    ["Static GK", /national (animal|bird|flower|fruit|river)|capital of|currency|largest|longest|highest|first|oldest|headquarters|nickname|tiger reserve|national park/i],
    ["General Awareness Misc", /./]
  ]
};

function sectionKey(section) {
  const s = String(section || "").toLowerCase();
  if (/reason|intelligence/.test(s)) return "reasoning";
  if (/quant|aptitude|math/.test(s)) return "quant";
  if (/english|comprehension/.test(s)) return "english";
  if (/awareness|general knowledge|\bgk\b/.test(s)) return "ga";
  return "";
}
function classifyChapter(section, stem) {
  const rules = CHAPTER_RULES[sectionKey(section)];
  if (!rules) return "Miscellaneous";
  for (const [name, re] of rules) if (re.test(stem)) return name;
  return "Miscellaneous";
}

/* --------------------------------------------------------------- html helpers */
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
const IMAGE_MARKER = /\[Image:\s*([^\]]+)\]/g;

/* Text export → safe HTML: [Image: url] becomes a real <img>, \(..\) becomes
   $..$ so the template's KaTeX pipeline picks it up, and newlines become
   paragraphs / <br>. */
function toHtml(raw, opts) {
  const wrap = !!(opts && opts.paragraph);
  let src = String(raw == null ? "" : raw).replace(/\r\n?/g, "\n");
  let out = "";
  let last = 0;
  let m;
  IMAGE_MARKER.lastIndex = 0;
  while ((m = IMAGE_MARKER.exec(src))) {
    out += richText(src.slice(last, m.index));
    out += '<img class="tb-img" src="' + escHtml(m[1].trim()) + '" alt="Question image" loading="lazy">';
    last = IMAGE_MARKER.lastIndex;
  }
  out += richText(src.slice(last));
  if (!wrap) return out;
  return out.split(/\n{2,}/).map(p => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
}
function richText(raw) {
  return escHtml(raw)
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$$$1$$$$")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$$")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

/* ------------------------------------------------------------------ metadata */
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
function paperMeta(title, yearFromFolder) {
  const titleStr = String(title || "").trim();
  const yearMatch = titleStr.match(/\b(19|20)\d{2}\b/);
  const year = String(yearFromFolder || (yearMatch ? yearMatch[0] : ""));
  let exam = titleStr.replace(/\b(19|20)\d{2}\b[\s\S]*$/, "").replace(/[-–—|,]+$/, "").trim();
  if (!exam) exam = "Exam";
  const dateM = titleStr.match(/Held\s*On\s*:?\s*(\d{1,2})\s*([A-Za-z]+),?\s*((?:19|20)\d{2})/i);
  let date = "";
  let sortKey = 0;
  if (dateM) {
    const day = Number(dateM[1]);
    const mon = MONTHS[dateM[2].toLowerCase().slice(0, 4)] || MONTHS[dateM[2].toLowerCase().slice(0, 3)] || 0;
    date = day + " " + dateM[2].charAt(0).toUpperCase() + dateM[2].slice(1).toLowerCase() + " " + dateM[3];
    sortKey = Number(dateM[3]) * 10000 + mon * 100 + day;
  } else {
    const d = titleStr.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-]((?:19|20)\d{2})/);
    if (d) {
      date = d[1] + "/" + d[2] + "/" + d[3];
      sortKey = Number(d[3]) * 10000 + Number(d[2]) * 100 + Number(d[1]);
    }
  }
  const shiftM = titleStr.match(/Shift\s*[-:]?\s*(\d+)/i);
  const shift = shiftM ? Number(shiftM[1]) : 0;
  if (!sortKey) sortKey = Number(year) * 10000;
  return { year, exam, date, shift, sortKey };
}

/* --------------------------------------------------------------------- build */
function readYearFolders() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{4}$/.test(d.name))
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function collectPapers() {
  const papers = [];
  const skipped = [];
  readYearFolders().forEach(year => {
    const dir = path.join(ROOT, year);
    const overrides = {};
    const overrideFile = path.join(dir, "chapters.json");
    if (fs.existsSync(overrideFile)) {
      try {
        Object.assign(overrides, JSON.parse(fs.readFileSync(overrideFile, "utf8")));
      } catch (e) {
        console.warn("  ! chapters.json in " + year + " is not valid JSON — ignored");
      }
    }
    fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".json") && !SKIP_FILES.has(f.toLowerCase()))
      .forEach(file => {
        const full = path.join(dir, file);
        let payload;
        try {
          payload = JSON.parse(fs.readFileSync(full, "utf8"));
        } catch (e) {
          skipped.push(file + " (invalid JSON)");
          return;
        }
        if (!payload || !Array.isArray(payload.questions) || !payload.questions.length) {
          skipped.push(file + " (no questions array)");
          return;
        }
        papers.push({ year, file, full, payload, overrides, meta: paperMeta(payload.test_title || payload.title || file.replace(/\.json$/i, ""), year) });
      });
  });
  papers.sort((a, b) =>
    a.meta.sortKey - b.meta.sortKey ||
    a.meta.shift - b.meta.shift ||
    a.file.localeCompare(b.file)
  );
  return { papers, skipped };
}

function build() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error('Missing template: "' + path.basename(TEMPLATE) + '" — keep it next to this script.');
    process.exit(1);
  }
  if (/const BAKED_QUESTIONS = \[[\s\S]*?\];/.test(fs.readFileSync(TEMPLATE, "utf8")) &&
      fs.readFileSync(TEMPLATE, "utf8").indexOf("const BAKED_QUESTIONS = [];") < 0) {
    console.warn("The template already contains baked questions; the build will replace them in the standalone copy.");
  }
  const { papers, skipped } = collectPapers();
  if (!papers.length) {
    console.error("No questions found. Put year folders (2025/, 2024/, …) with exam JSON files next to this script.");
    process.exit(1);
  }

  const questions = [];
  const titles = {};
  const seenIds = new Set();
  let mockNo = 0;
  let bad = 0;
  const chapterCounts = {};

  papers.forEach(paper => {
    mockNo += 1;
    const { year, exam, date, shift } = paper.meta;
    titles[mockNo] = (date ? date + " · " : "") + (shift ? "Shift " + shift + " · " : "") + exam +
      (paper.meta.year !== year ? "" : "");
    let n = 0;
    paper.payload.questions.forEach(q => {
      if (!q || !q.question) return;
      const opts = q.options || {};
      const ans = String(q.correct_option || q.ans || "").trim().toUpperCase().charAt(0);
      if (!["A", "B", "C", "D"].every(L => opts[L] != null && String(opts[L]).trim() !== "") || !["A", "B", "C", "D"].includes(ans)) {
        bad += 1;
        return;
      }
      n += 1;
      let id = String(q.id || q.question_id || "").trim();
      if (!id) id = year + "-" + paper.payload.test_id + "-" + (q.number || n);
      while (seenIds.has(id)) id += "-dup";
      seenIds.add(id);

      const section = String(q.section || "General").trim();
      const passage = String(q.passage || "").trim();
      const stemPlain = [passage, q.question].filter(Boolean).join(" ");
      const chapter = String(q.chapter || q.sub || paper.overrides[id] || "").trim() ||
        classifyChapter(section, stemPlain + " " + Object.values(opts).join(" "));

      chapterCounts[section] = chapterCounts[section] || {};
      chapterCounts[section][chapter] = (chapterCounts[section][chapter] || 0) + 1;

      questions.push({
        id: id,
        qnum: n,
        text: (passage ? '<div class="passage-box">' + toHtml(passage, { paragraph: true }) + "</div>" : "") +
          toHtml(q.question, { paragraph: true }),
        opts: { A: toHtml(opts.A), B: toHtml(opts.B), C: toHtml(opts.C), D: toHtml(opts.D) },
        ans: ans,
        sol: toHtml(q.solution || q.explanation || "", { paragraph: true }),
        topic: section,
        sub: chapter,
        mock: mockNo,
        year: year,
        exam: exam
      });
    });
  });

  const json = JSON.stringify(questions)
    .replace(/<\/script/gi, "<\\/script")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  let html = fs.readFileSync(TEMPLATE, "utf8");
  const startAt = html.indexOf(START);
  const endAt = html.indexOf(END);
  if (startAt < 0 || endAt < startAt) {
    console.error("Could not find the BAKED_DATASET markers in the template.");
    process.exit(1);
  }
  const block = START + "\nconst BAKED_QUESTIONS = " + json + ";\nconst BAKED_MOCK_TITLES = " +
    JSON.stringify(titles) + ";\n" + END;
  html = html.slice(0, startAt) + block + html.slice(endAt + END.length);
  fs.writeFileSync(OUTPUT, html, "utf8");

  console.log("Baked " + questions.length + " questions from " + papers.length + " papers into \"" + path.basename(OUTPUT) + "\".");
  console.log("Template left untouched: \"" + path.basename(TEMPLATE) + "\".");
  const byYear = {};
  questions.forEach(q => { byYear[q.year] = (byYear[q.year] || 0) + 1; });
  console.log("Years: " + Object.keys(byYear).map(y => y + " (" + byYear[y] + ")").join(", "));
  const exams = [...new Set(questions.map(q => q.exam))];
  console.log("Exams: " + exams.join(", "));
  console.log("Size: " + (Buffer.byteLength(html) / 1048576).toFixed(2) + " MB");
  if (bad) console.warn("Skipped " + bad + " questions with missing options/answer.");
  if (skipped.length) console.warn("Skipped files: " + skipped.join("; "));
  Object.keys(chapterCounts).forEach(section => {
    const rows = Object.entries(chapterCounts[section]).sort((a, b) => b[1] - a[1]);
    console.log("\n" + section + " — " + rows.length + " chapters");
    rows.slice(0, 8).forEach(([name, n]) => console.log("  " + n + "\t" + name));
  });
}

build();
