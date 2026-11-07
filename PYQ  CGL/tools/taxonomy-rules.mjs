import fs from "node:fs/promises";
import path from "node:path";
import { classifyGA } from "./ga-rules.mjs";
import { classifyReasoning } from "./rea-rules.mjs";
import { classifyQuant } from "./quant-rules.mjs";
import { classifyEnglish } from "./en-rules.mjs";

// Load canonical taxonomy
const taxonomyRaw = await fs.readFile("taxonomy.json", "utf8");
const TAXONOMY = JSON.parse(taxonomyRaw);

// Build fast lookup validation set
const validSubjects = new Set();
const validChapters = new Set();
const validTopics = new Set();
const validMicroTopics = new Set();
const microToPath = new Map();

TAXONOMY.subjects.forEach(sub => {
  validSubjects.add(sub.id);
  sub.chapters.forEach(ch => {
    validChapters.add(ch.id);
    ch.topics.forEach(top => {
      validTopics.add(top.id);
      top.microTopics.forEach(micro => {
        validMicroTopics.add(micro.id);
        microToPath.set(micro.id, {
          subjectId: sub.id,
          chapterId: ch.id,
          topicId: top.id,
          microTopicId: micro.id,
          subjectName: sub.name,
          chapterName: ch.name,
          topicName: top.name,
          microTopicName: micro.name
        });
      });
    });
  });
});

export function classifyQuestion(q) {
  const sec = (q.section || "").toLowerCase();
  const stem = (q.question || "").toLowerCase();
  const sol = (q.solution || "").toLowerCase();
  const expHtml = (q.explanation_html || "").toLowerCase();
  const opts = Object.values(q.options || {}).join(" ").toLowerCase();
  const allText = `${stem} ${opts} ${sol} ${expHtml}`;

  // Stage 1: Deterministic Subject mapping
  let subjectId = "quant";
  if (sec.includes("reasoning") || sec.includes("intelligence") || (q.number >= 1 && q.number <= 25)) {
    subjectId = "reasoning";
  } else if (sec.includes("awareness") || (q.number >= 26 && q.number <= 50)) {
    subjectId = "ga";
  } else if (sec.includes("quantitative") || sec.includes("quant") || (q.number >= 51 && q.number <= 75)) {
    subjectId = "quant";
  } else if (sec.includes("english") || sec.includes("comprehension") || (q.number >= 76 && q.number <= 100)) {
    subjectId = "english";
  }

  let microTopicId = null;
  let confidence = 0.9;
  let format = "standard";

  if (subjectId === "reasoning") {
    const r = classifyReasoning({ stem: q.question || "", options: q.options || {} });
    microTopicId = r.microTopicId; confidence = r.confidence; format = r.format;
  } else if (subjectId === "ga") {
    const g = classifyGA({ stem: q.question || "", solution: q.solution || "", explanation: q.explanation_html || "" });
    microTopicId = g.microTopicId; confidence = g.confidence; format = "gk-fact";
  } else if (subjectId === "quant") {
    const x = classifyQuant({ stem: q.question || "", options: q.options || {} });
    microTopicId = x.microTopicId; confidence = x.confidence; format = x.format;
  } else {
    const e = classifyEnglish({ stem: q.question || "", options: q.options || {}, passage: q.passage || "" });
    microTopicId = e.microTopicId; confidence = e.confidence; format = e.format;
  }

  const pathInfo = microToPath.get(microTopicId);
  return {
    subjectId,
    chapterId: pathInfo ? pathInfo.chapterId : "general",
    topicId: pathInfo ? pathInfo.topicId : "general",
    microTopicId,
    subjectName: pathInfo ? pathInfo.subjectName : subjectId,
    chapterName: pathInfo ? pathInfo.chapterName : "General",
    topicName: pathInfo ? pathInfo.topicName : "General",
    microTopicName: pathInfo ? pathInfo.microTopicName : microTopicId,
    format,
    confidence
  };
}
