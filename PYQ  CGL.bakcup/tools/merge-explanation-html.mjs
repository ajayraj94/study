#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dirArg = args.find((arg) => !arg.startsWith("--")) || "2025";
const dir = path.resolve(dirArg);

function stripExplanationLabel(html) {
  return html
    .replace(/^\s*<strong>\s*Explanation:?\s*<\/strong>\s*(?:<br\s*\/?>)?/i, "")
    .trim();
}

function extractDivInner(card, openingTag) {
  const openStart = card.indexOf(openingTag);
  if (openStart < 0) return null;
  const openEnd = openStart + openingTag.length;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = openEnd;
  let depth = 1;
  let match;
  while ((match = tagRe.exec(card))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return card.slice(openEnd, match.index);
    } else if (!/\/>$/.test(match[0])) {
      depth += 1;
    }
  }
  return null;
}

function extractExplanations(html) {
  const cardRe = /<div\b[^>]*\bclass\s*=\s*(?:"[^"]*\bq-card\b[^"]*"|'[^']*\bq-card\b[^']*')[^>]*>/gi;
  const starts = [];
  let match;
  while ((match = cardRe.exec(html))) starts.push(match.index);

  const byNumber = new Map();
  const byIndex = [];
  starts.forEach((start, index) => {
    const card = html.slice(start, starts[index + 1] ?? html.length);
    const badge = card.match(
      /<span\b[^>]*\bclass\s*=\s*(?:"[^"]*\bq-badge\b[^"]*"|'[^']*\bq-badge\b[^']*')[^>]*>([\s\S]*?)<\/span>/i,
    );
    const numberText = badge?.[1] ?? card.match(/Question\s*No\.?\s*(\d+)/i)?.[0] ?? "";
    const number = Number(numberText.match(/\d+/)?.[0] || index + 1);

    const solTag = card.match(
      /<div\b[^>]*\bclass\s*=\s*(?:"[^"]*\bsol-box\b[^"]*"|'[^']*\bsol-box\b[^']*')[^>]*>/i,
    )?.[0];
    if (!solTag) return;
    const inner = extractDivInner(card, solTag);
    if (!inner) return;
    const formatted = stripExplanationLabel(inner);
    if (!formatted) return;
    byNumber.set(number, formatted);
    byIndex[index] = formatted;
  });

  return { byNumber, byIndex };
}

async function findHtml(base) {
  for (const ext of [".html", ".htm"]) {
    const candidate = path.join(dir, base + ext);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

const entries = await fs.readdir(dir, { withFileTypes: true });
const jsonFiles = entries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
  .map((entry) => entry.name)
  .sort();

if (!jsonFiles.length) {
  console.error(`No JSON files found in ${dir}`);
  process.exit(1);
}

let totalQuestions = 0;
let totalMatched = 0;
let totalFiles = 0;
let totalMissing = 0;

for (const file of jsonFiles) {
  const jsonPath = path.join(dir, file);
  const htmlPath = await findHtml(file.replace(/\.json$/i, ""));
  if (!htmlPath) {
    console.warn(`SKIP ${file}: matching HTML not found`);
    totalMissing += 1;
    continue;
  }

  const data = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  const questions = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(questions)) {
    console.warn(`SKIP ${file}: no questions array`);
    totalMissing += 1;
    continue;
  }

  const { byNumber, byIndex } = extractExplanations(await fs.readFile(htmlPath, "utf8"));
  let matched = 0;
  questions.forEach((question, index) => {
    const formatted = byNumber.get(Number(question.number)) ?? byIndex[index];
    if (!formatted) return;
    question.explanation_html = formatted;
    matched += 1;
  });

  totalQuestions += questions.length;
  totalMatched += matched;
  totalFiles += 1;

  if (!dryRun) {
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }
  console.log(`${dryRun ? "DRY " : ""}${file}: ${matched}/${questions.length} formatted explanations`);
}

console.log(
  `\n${dryRun ? "Would embed" : "Embedded"} ${totalMatched}/${totalQuestions} explanations across ${totalFiles} files` +
    (totalMissing ? `; ${totalMissing} files skipped` : ""),
);

if (totalMatched < totalQuestions) process.exitCode = 2;
