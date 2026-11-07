import fs from "node:fs/promises";
import path from "node:path";

// Ensure global.window is available to load tags-index-compact.js
global.window = {};
await import("../tags-index-compact.js");

const tagsIndex = global.window.SSC_TAGS_INDEX;
if (!tagsIndex || !tagsIndex.shifts) {
  console.error("Failed to load tags index!");
  process.exit(1);
}

const shifts = tagsIndex.shifts;
console.log(`Processing ${shifts.length} shifts from 2025/...`);

const rawQuestions = [];
let totalCount = 0;

for (const s of shifts) {
  const filePath = path.join("2025", s.fileName);
  const content = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(content);
  const questions = data.questions || [];

  for (const q of questions) {
    totalCount++;
    const key = `M${s.mockNum}-Q${q.number}`;
    const tag = tagsIndex.byKey[key] || {};

    let opts = [];
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      opts = [q.options.A || "", q.options.B || "", q.options.C || "", q.options.D || ""];
    } else if (Array.isArray(q.options)) {
      opts = q.options.map(o => (typeof o === "object" ? (o.text || o.value || "") : String(o)));
    }
    while (opts.length < 4) opts.push("");

    let correctIdx = 0;
    if (q.correct_option === "A" || q.correct_option === 0 || q.correct_option === "1") correctIdx = 0;
    else if (q.correct_option === "B" || q.correct_option === 1 || q.correct_option === "2") correctIdx = 1;
    else if (q.correct_option === "C" || q.correct_option === 2 || q.correct_option === "3") correctIdx = 2;
    else if (q.correct_option === "D" || q.correct_option === 3 || q.correct_option === "4") correctIdx = 3;
    else if (typeof q.correctIndex === "number") correctIdx = q.correctIndex;

    const secId = q.number <= 25 ? "reasoning" : q.number <= 50 ? "ga" : q.number <= 75 ? "quant" : "english";

    rawQuestions.push({
      k: key,
      m: s.mockNum,
      qn: q.number,
      s: tag.s || secId,
      q: q.question || "",
      p: q.passage || "",
      o: opts,
      a: correctIdx,
      e: q.explanation_html || q.solution_html || q.solution || ""
    });
  }
}

console.log(`Extracted ${totalCount} questions.`);

const outJs = `// Auto-generated 100% Genuine Question Bank from 45 Official Testbook SSC CGL 2025 Shifts
(function() {
  const raw = ${JSON.stringify(rawQuestions)};
  const bank = {};
  const tags = (typeof window !== "undefined" && window.SSC_TAGS_INDEX && window.SSC_TAGS_INDEX.byKey) ? window.SSC_TAGS_INDEX.byKey : {};
  const shifts = (typeof window !== "undefined" && window.SSC_TAGS_INDEX && window.SSC_TAGS_INDEX.shifts) ? window.SSC_TAGS_INDEX.shifts : [];
  const shiftMap = new Map(shifts.map(s => [s.mockNum, s]));

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const tag = tags[item.k] || {};
    const shift = shiftMap.get(item.m);
    bank[item.k] = {
      key: item.k,
      mockNum: item.m,
      qNum: item.qn,
      year: "2025",
      shift: tag.sl || (shift ? shift.shiftLabel : ("Shift " + item.m)),
      sectionId: tag.s || item.s,
      chapterName: tag.cn || "General",
      topicName: tag.tn || "General",
      microTopicName: tag.mn || "General Pattern",
      format: tag.fmt || "standard",
      question: item.q,
      passage: item.p,
      options: item.o,
      correctIndex: item.a,
      explanation: item.e,
      idealTimeSec: 30,
      sourceFile: shift ? ("2025/" + shift.fileName) : "",
      isCustomLoaded: true
    };
  }
  if (typeof window !== "undefined") {
    window.SSC_QUESTIONS_BANK = bank;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = bank;
  }
})();
`;

await fs.writeFile("questions-data.js", outJs, "utf8");
console.log(`Successfully generated questions-data.js! File size: ${(outJs.length / (1024 * 1024)).toFixed(2)} MB`);
