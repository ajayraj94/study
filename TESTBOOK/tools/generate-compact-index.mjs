import fs from "node:fs/promises";

const raw = await fs.readFile("tags-index.json", "utf8");
const d = JSON.parse(raw);

const compactByKey = {};
for (const [k, v] of Object.entries(d.byKey)) {
  if (k.startsWith("M")) {
    compactByKey[k] = {
      s: v.subjectId,
      c: v.chapterId,
      t: v.topicId,
      m: v.microTopicId,
      cn: v.chapterName,
      tn: v.topicName,
      mn: v.microTopicName,
      fmt: v.format,
      sl: v.shiftLabel
    };
  }
}

const compactHierarchy = {};
for (const [sId, sVal] of Object.entries(d.hierarchy)) {
  compactHierarchy[sId] = {
    id: sId,
    name: sVal.name,
    short: sVal.short,
    icon: sVal.icon,
    qRange: sVal.qRange,
    total: sVal.totalQuestions,
    chapters: {}
  };
  for (const [cId, cVal] of Object.entries(sVal.chapters)) {
    compactHierarchy[sId].chapters[cId] = {
      id: cId,
      name: cVal.name,
      total: cVal.totalQuestions,
      topics: {}
    };
    for (const [tId, tVal] of Object.entries(cVal.topics)) {
      compactHierarchy[sId].chapters[cId].topics[tId] = {
        id: tId,
        name: tVal.name,
        total: tVal.totalQuestions,
        microTopics: {}
      };
      for (const [mId, mVal] of Object.entries(tVal.microTopics)) {
        compactHierarchy[sId].chapters[cId].topics[tId].microTopics[mId] = {
          id: mId,
          name: mVal.name,
          count: mVal.questionCount,
          freq: mVal.shiftFrequencyPct,
          highYield: mVal.isHighYield,
          keys: (mVal.questionRefs || []).map(r => r.key)
        };
      }
    }
  }
}

const payload = {
  version: "2.0.0",
  totalShifts: d.totalShifts,
  totalQuestions: d.totalQuestions,
  shifts: d.shifts,
  hierarchy: compactHierarchy,
  byKey: compactByKey
};

const jsContent = `window.SSC_TAGS_INDEX = ${JSON.stringify(payload)};\n`;
await fs.writeFile("tags-index-compact.js", jsContent, "utf8");
console.log("Successfully created tags-index-compact.js (size: " + (jsContent.length / 1024).toFixed(1) + " KB)");

