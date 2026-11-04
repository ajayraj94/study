import fs from "node:fs/promises";
import path from "node:path";
import { classifyQuestion } from "./taxonomy-rules.mjs";

const taxonomyRaw = await fs.readFile("taxonomy.json", "utf8");
const TAXONOMY = JSON.parse(taxonomyRaw);

const dir2025 = path.resolve("2025");
const files = (await fs.readdir(dir2025))
  .filter(f => f.endsWith(".json"))
  .sort((a, b) => {
    const numA = parseInt(a.match(/Shift\s*(\d+)/i)?.[1] || "0", 10);
    const numB = parseInt(b.match(/Shift\s*(\d+)/i)?.[1] || "0", 10);
    return a.localeCompare(b, undefined, { numeric: true });
  });

console.log(`Discovered ${files.length} paper JSON files in 2025 directory.`);

let grandTotalQuestions = 0;
const shiftRegistry = [];
const microTopicStats = new Map();
const flatQuestionMap = {};

// Initialize stats map from taxonomy
TAXONOMY.subjects.forEach(sub => {
  sub.chapters.forEach(ch => {
    ch.topics.forEach(top => {
      top.microTopics.forEach(micro => {
        microTopicStats.set(micro.id, {
          subjectId: sub.id,
          chapterId: ch.id,
          topicId: top.id,
          microTopicId: micro.id,
          subjectName: sub.name,
          chapterName: ch.name,
          topicName: top.name,
          microTopicName: micro.name,
          questionCount: 0,
          shiftOccurrences: new Set(),
          questionRefs: []
        });
      });
    });
  });
});

for (let mockIndex = 0; mockIndex < files.length; mockIndex++) {
  const fileName = files[mockIndex];
  const filePath = path.join(dir2025, fileName);
  const rawText = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(rawText);

  const mockNum = mockIndex + 1;
  const mockId = `M${mockNum}`;

  // Extract shift metadata
  const title = data.test_title || fileName;
  const dateMatch = title.match(/(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/i) || title.match(/(\d{1,2}\s+[A-Za-z]+)/i);
  const shiftMatch = title.match(/Shift\s*(\d+)/i);
  const dateStr = dateMatch ? dateMatch[1].replace(",", "").trim() : "Sept 2025";
  const shiftStr = shiftMatch ? `Shift ${shiftMatch[1]}` : "Shift 1";
  const shiftLabel = `${dateStr} · ${shiftStr}`;

  shiftRegistry.push({
    mockId,
    mockNum,
    fileName,
    title,
    shiftLabel,
    questionCount: data.questions ? data.questions.length : 0
  });

  if (Array.isArray(data.questions)) {
    data.questions.forEach((q, qIdx) => {
      grandTotalQuestions++;
      const qNum = q.number || qIdx + 1;
      const key = `${mockId}-Q${qNum}`;

      const tagInfo = classifyQuestion(q);
      
      // Update stats
      let stat = microTopicStats.get(tagInfo.microTopicId);
      if (!stat) {
        stat = {
          subjectId: tagInfo.subjectId,
          chapterId: tagInfo.chapterId,
          topicId: tagInfo.topicId,
          microTopicId: tagInfo.microTopicId,
          subjectName: tagInfo.subjectName,
          chapterName: tagInfo.chapterName,
          topicName: tagInfo.topicName,
          microTopicName: tagInfo.microTopicName,
          questionCount: 0,
          shiftOccurrences: new Set(),
          questionRefs: []
        };
        microTopicStats.set(tagInfo.microTopicId, stat);
      }

      stat.questionCount++;
      stat.shiftOccurrences.add(mockId);
      stat.questionRefs.push({
        id: q.id,
        key,
        mockId,
        mockNum,
        qNum,
        shiftLabel,
        correct_option: q.correct_option
      });

      // Embed into question object
      q.meta = {
        key,
        mockId,
        mockNum,
        qNum,
        subjectId: tagInfo.subjectId,
        chapterId: tagInfo.chapterId,
        topicId: tagInfo.topicId,
        microTopicId: tagInfo.microTopicId,
        chapterName: tagInfo.chapterName,
        topicName: tagInfo.topicName,
        microTopicName: tagInfo.microTopicName,
        format: tagInfo.format,
        exam: {
          year: 2025,
          shiftLabel,
          date: dateStr,
          shift: shiftStr
        },
        tagging: {
          method: "rules-engine-v2",
          confidence: tagInfo.confidence
        }
      };

      flatQuestionMap[key] = {
        id: q.id,
        key,
        mockNum,
        qNum,
        subjectId: tagInfo.subjectId,
        chapterId: tagInfo.chapterId,
        topicId: tagInfo.topicId,
        microTopicId: tagInfo.microTopicId,
        chapterName: tagInfo.chapterName,
        topicName: tagInfo.topicName,
        microTopicName: tagInfo.microTopicName,
        format: tagInfo.format,
        shiftLabel
      };
      if (q.id) {
        flatQuestionMap[q.id] = flatQuestionMap[key];
      }
    });

    // Write back tagged JSON non-destructively
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

// Build hierarchical index
const totalShifts = files.length;
const hierarchy = {};

TAXONOMY.subjects.forEach(sub => {
  hierarchy[sub.id] = {
    id: sub.id,
    name: sub.name,
    short: sub.short,
    icon: sub.icon,
    qRange: sub.qRange,
    totalQuestions: 0,
    chapters: {}
  };

  sub.chapters.forEach(ch => {
    hierarchy[sub.id].chapters[ch.id] = {
      id: ch.id,
      name: ch.name,
      totalQuestions: 0,
      topics: {}
    };

    ch.topics.forEach(top => {
      hierarchy[sub.id].chapters[ch.id].topics[top.id] = {
        id: top.id,
        name: top.name,
        totalQuestions: 0,
        microTopics: {}
      };

      top.microTopics.forEach(micro => {
        const stat = microTopicStats.get(micro.id);
        const count = stat ? stat.questionCount : 0;
        const shiftsPresent = stat ? stat.shiftOccurrences.size : 0;
        const shiftFrequencyPct = Math.round((shiftsPresent / totalShifts) * 1000) / 10;
        const isHighYield = shiftFrequencyPct >= 65.0;

        hierarchy[sub.id].totalQuestions += count;
        hierarchy[sub.id].chapters[ch.id].totalQuestions += count;
        hierarchy[sub.id].chapters[ch.id].topics[top.id].totalQuestions += count;

        hierarchy[sub.id].chapters[ch.id].topics[top.id].microTopics[micro.id] = {
          id: micro.id,
          name: micro.name,
          questionCount: count,
          shiftsPresent,
          shiftFrequencyPct,
          isHighYield,
          questionRefs: stat ? stat.questionRefs : []
        };
      });
    });
  });
});

const masterIndex = {
  version: "2.0.0",
  generatedAt: new Date().toISOString(),
  totalQuestions: grandTotalQuestions,
  totalShifts,
  shifts: shiftRegistry,
  hierarchy,
  byKey: flatQuestionMap
};

await fs.writeFile("tags-index.json", JSON.stringify(masterIndex, null, 2), "utf8");
console.log(`Successfully generated tags-index.json. Total questions processed: ${grandTotalQuestions} across ${totalShifts} shifts.`);

// Generate Tagging Audit Report
let reportMd = `# SSC CGL Granular Tagging Audit Report\n\n`;
reportMd += `**Total Papers Processed**: ${totalShifts}\n`;
reportMd += `**Total Questions Tagged**: ${grandTotalQuestions}\n`;
reportMd += `**Tagging Granularity**: 4-Tier (Subject > Chapter > Topic > Micro-Topic)\n\n`;
reportMd += `## Subject Distribution\n\n`;
reportMd += `| Subject | Total Questions | Chapters | Topics | Micro-Topics |\n`;
reportMd += `| :--- | :--- | :--- | :--- | :--- |\n`;

TAXONOMY.subjects.forEach(sub => {
  const sData = hierarchy[sub.id];
  let chCount = 0;
  let topCount = 0;
  let microCount = 0;
  Object.values(sData.chapters).forEach(ch => {
    chCount++;
    Object.values(ch.topics).forEach(top => {
      topCount++;
      microCount += Object.keys(top.microTopics).length;
    });
  });
  reportMd += `| ${sData.name} | ${sData.totalQuestions} | ${chCount} | ${topCount} | ${microCount} |\n`;
});

reportMd += `\n## Top High-Yield Exam Micro-Topics (Appeared in ≥ 65% of Shifts)\n\n`;
reportMd += `| Subject | Chapter | Topic | Micro-Topic | Shift % | Total Qs |\n`;
reportMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

const allMicros = [];
TAXONOMY.subjects.forEach(sub => {
  Object.values(hierarchy[sub.id].chapters).forEach(ch => {
    Object.values(ch.topics).forEach(top => {
      Object.values(top.microTopics).forEach(m => {
        allMicros.push({
          sub: sub.name,
          ch: ch.name,
          top: top.name,
          micro: m.name,
          pct: m.shiftFrequencyPct,
          count: m.questionCount
        });
      });
    });
  });
});

allMicros.sort((a, b) => b.pct - a.pct || b.count - a.count);
allMicros.filter(m => m.pct >= 65).forEach(m => {
  reportMd += `| ${m.sub} | ${m.ch} | ${m.top} | **${m.micro}** | **${m.pct}%** | ${m.count} |\n`;
});

await fs.writeFile("tagging-report.md", reportMd, "utf8");
console.log("Successfully wrote tagging-report.md");

