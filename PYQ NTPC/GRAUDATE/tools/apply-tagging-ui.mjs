import fs from "node:fs/promises";
import path from "node:path";

const indexPath = path.resolve("index.html");
const backupPath = path.resolve("index.html.bak");

let html = await fs.readFile(indexPath, "utf8");
await fs.writeFile(backupPath, html, "utf8");
console.log("Created backup at index.html.bak");

// 1. Add script tag in head if not already present
if (!html.includes('src="tags-index-compact.js"')) {
  html = html.replace(
    '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>\n    <script src="tags-index-compact.js"></script>'
  );
  console.log("Added tags-index-compact.js script tag to head.");
}

// 2. Add styles to #exam-ui-polish
const customStyles = `
/* Micro-Topic & Exam Trend Explorer Styles */
.topic-pill-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 0 10px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.topic-pill-bar::-webkit-scrollbar { height: 4px; }
.topic-pill-bar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
.topic-pill {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.topic-pill:hover {
  background: var(--surface-subtle);
  color: var(--text);
  border-color: var(--border-strong);
}
.topic-pill.active {
  background: var(--blue-bg);
  border-color: var(--blue);
  color: var(--blue);
}
.micro-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}
.micro-card-grid::-webkit-scrollbar { width: 4px; }
.micro-card-grid::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
.micro-card {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.micro-card:hover {
  background: var(--surface-subtle);
  border-color: var(--blue);
  transform: translateY(-1px);
}
.micro-card.active {
  border-color: var(--blue);
  background: var(--blue-bg);
  box-shadow: 0 0 0 1px var(--blue);
}
.micro-card-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
  margin-bottom: 6px;
}
.micro-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
}
.trend-tag-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.trend-tag-badge.high {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.trend-tag-badge.med {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.trend-tag-badge.low {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.25);
}
.active-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--surface-subtle);
  border-radius: 6px;
  border: 1px dashed var(--blue);
  margin-bottom: 10px;
  font-size: 11px;
  color: var(--text);
}
.clear-subfilter-btn {
  background: none;
  border: none;
  color: var(--blue);
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.clear-subfilter-btn:hover {
  background: var(--blue-bg);
}
`;

if (!html.includes(".micro-card-grid")) {
  html = html.replace(
    '<style id="exam-ui-polish">',
    `<style id="exam-ui-polish">\n${customStyles}`
  );
  console.log("Added micro-topic CSS styles to exam-ui-polish.");
}

// 3. Update iu mock array
const oldIuRe = /iu=Array\.from\(\{length:24\}\s*,\s*\(S,H\)=>\{[^}]*return\{id:"M"\+\(H\+1\)[^}]*\}\}\);/;
const newIu = `iu=(window.SSC_TAGS_INDEX&&window.SSC_TAGS_INDEX.shifts)?window.SSC_TAGS_INDEX.shifts.map((s,idx)=>({id:s.mockId,mockNum:s.mockNum,year:"2025",folderPath:\`2025/\${s.fileName}\`,title:s.shiftLabel+" · SSC CGL",shortDate:s.shiftLabel,qs:s.questionCount||100})):Array.from({length:24},(S,H)=>{const C=H<8?"2025":H<16?"2024":"2023",r=12+Math.floor(H%8/3),D=H%3+1;return{id:"M"+(H+1),mockNum:H+1,year:C,folderPath:\`\${C}/Shift_\${D}_Day_\${r}.json\`,title:\`\${r} Sept \${C} · Shift \${D} · SSC CGL\`,shortDate:\`\${r} Sept \${C} · S\${D}\`,qs:100}});`;

if (oldIuRe.test(html)) {
  html = html.replace(oldIuRe, newIu);
  console.log("Updated iu to dynamically use window.SSC_TAGS_INDEX.shifts (45 shifts).");
} else {
  console.log("oldIuRe not matched or already updated.");
}

// 4. Update Vc generator loop from 24 to dynamic total
const oldVcRe = /for\(let r=1;r<=24;r\+\+\)for\(let D=1;D<=100;D\+\+\)\{const U=`M\$\{r\}-Q\$\{D\}`;/;
const newVc = `const _totM=(window.SSC_TAGS_INDEX?.totalShifts)||45;for(let r=1;r<=_totM;r++)for(let D=1;D<=100;D++){const U=\`M\${r}-Q\${D}\`;`;

if (oldVcRe.test(html)) {
  html = html.replace(oldVcRe, newVc);
  console.log("Updated Vc to initialize all 45 mocks in SRS.");
}

// 5. Update _i implementation
const oldUnderIRe = /const _i = \(sec, chIdx\) => \{\s*const list = \[\];\s*const ch = sec\.chapters\[chIdx\];\s*const chName = ch \? ch\.name\.toLowerCase\(\) : "";\s*for \(let m = 1; m <= 24; m\+\+\) \{\s*for \(let q = sec\.qRange\[0\]; q <= sec\.qRange\[1\]; q\+\+\) \{\s*const key = "M" \+ m \+ "-Q" \+ q;\s*const custom = k\[key\];\s*const match = custom \? \(custom\.chapterName && custom\.chapterName\.toLowerCase\(\) === chName\) : \(\(m \+ q\) % sec\.chapters\.length === chIdx\);\s*if \(match\) \{\s*list\.push\(\{\s*key,\s*mockNum: m,\s*qNum: q,\s*meta: U\[key\] \|\| \{ status: "learning" \},\s*shortLabel: "M" \+ m \+ "·Q" \+ q\s*\}\);\s*\}\s*\}\s*\}\s*return list;\s*\};/;

const newUnderI = `const _i = (sec, chIdx) => {
    const list = [];
    const ch = sec.chapters[chIdx];
    const chId = ch ? (ch.id || "") : "";
    const chName = ch ? ch.name.toLowerCase() : "";
    const totalM = (window.SSC_TAGS_INDEX && window.SSC_TAGS_INDEX.totalShifts) ? window.SSC_TAGS_INDEX.totalShifts : 45;
    for (let m = 1; m <= totalM; m++) {
      for (let q = sec.qRange[0]; q <= sec.qRange[1]; q++) {
        const key = "M" + m + "-Q" + q;
        const custom = k[key];
        const tag = (window.SSC_TAGS_INDEX && window.SSC_TAGS_INDEX.byKey) ? window.SSC_TAGS_INDEX.byKey[key] : null;
        let match = false;
        if (tag) {
          match = (tag.c === chId) || (tag.cn && tag.cn.toLowerCase() === chName);
        } else if (custom) {
          match = (custom.chapterName && custom.chapterName.toLowerCase() === chName);
        } else {
          match = ((m + q) % sec.chapters.length === chIdx);
        }
        if (match) {
          list.push({
            key,
            mockNum: m,
            qNum: q,
            meta: U[key] || { status: "learning" },
            shortLabel: "M" + m + "·Q" + q,
            tag: tag || null
          });
        }
      }
    }
    return list;
  };`;

if (oldUnderIRe.test(html)) {
  html = html.replace(oldUnderIRe, newUnderI);
  console.log("Updated _i to use real tag lookups across all 45 shifts.");
} else {
  console.log("oldUnderIRe not matched or already updated.");
}

// 6. Update cn implementation to enrich with tags
const oldCnRe = /function cn\(S,H,C,r\)\{const D=`M\$\{S\}-Q\$\{H\}`,U=C&&el\.find\(w=>w\.id===C\)\|\|uu\(H\),G=iu\[S-1\]\|\|iu\[0\],k=typeof r=="number"&&U\.chapters\[r\]\?U\.chapters\[r\]:U\.chapters\[\(S\+H\)%U\.chapters\.length\],_=Zd\[U\.id\]\|\|Zd\.quant,j=_\[\(S\+H\)%_\.length\];return\{key:D,mockNum:S,qNum:H,year:G\.year,shift:G\.title,sectionId:U\.id,chapterName:k\.name,question:`\$\{j\.q\} \[SSC CGL \$\{G\.year\} · Mock M\$\{S\} · Q\$\{H\}\]`,options:j\.options,correctIndex:j\.ans,explanation:j\.sol,idealTimeSec:j\.idealTime,sourceFile:`\$\{G\.year\}\/M\$\{S\}_\$\{U\.id\}_Q\$\{H\}\.json`,isCustomLoaded:!1\}\}/;

const newCn = `function cn(S,H,C,r){const D=\`M\${S}-Q\${H}\`,U=C&&el.find(w=>w.id===C)||uu(H),G=iu[S-1]||iu[0],tag=window.SSC_TAGS_INDEX?.byKey?.[D],k=tag?(el.find(w=>w.id===tag.s)?.chapters?.find(c=>c.id===tag.c)||{name:tag.cn}):(typeof r=="number"&&U.chapters[r]?U.chapters[r]:U.chapters[(S+H)%U.chapters.length]),_=Zd[U.id]||Zd.quant,j=_[(S+H)%_.length];return{key:D,mockNum:S,qNum:H,year:G.year,shift:tag?tag.sl:G.title,sectionId:U.id,chapterName:tag?tag.cn:k.name,topicName:tag?tag.tn:"General",microTopicName:tag?tag.mn:"General Pattern",format:tag?tag.fmt:"standard",question:tag?\`[\${tag.mn}] \${j.q} [SSC CGL 2025 · Mock M\${S} · Q\${H}]\`:\`\${j.q} [SSC CGL \${G.year} · Mock M\${S} · Q\${H}]\`,options:j.options,correctIndex:j.ans,explanation:j.sol,idealTimeSec:j.idealTime,sourceFile:\`\${G.year}/M\${S}_\${U.id}_Q\${H}.json\`,isCustomLoaded:!1}}`;

if (oldCnRe.test(html)) {
  html = html.replace(oldCnRe, newCn);
  console.log("Updated cn to return genuine tags and metadata.");
} else {
  console.log("oldCnRe not matched or already updated.");
}

// 7. Update Ee weightPct & avgPerShift
const oldEeCalcRe = /weightPct:\(M\.qs\/600\*100\)\.toFixed\(1\),avgPerShift:\(M\.qs\/24\)\.toFixed\(1\),isHighYield:M\.qs>=50/;
const newEeCalc = `weightPct:((I.length||M.qs)/((window.SSC_TAGS_INDEX?.hierarchy?.[bt.id]?.total)||1125)*100).toFixed(1),avgPerShift:((I.length||M.qs)/((window.SSC_TAGS_INDEX?.totalShifts)||45)).toFixed(1),isHighYield:((I.length||M.qs)/((window.SSC_TAGS_INDEX?.totalShifts)||45))>=0.65`;

if (oldEeCalcRe.test(html)) {
  html = html.replace(oldEeCalcRe, newEeCalc);
  console.log("Updated Ee calculations to be dynamic.");
} else {
  console.log("oldEeCalcRe not matched or already updated.");
}

// 8. Add drawer tags in popup modal
const oldDrawerTagRe = /i\.jsx\("span",\{className:"exam-tag",children:ee\.chapterName\}\)\]\}\)/;
const newDrawerTag = 'i.jsx("span",{className:"exam-tag",children:ee.chapterName}),ee.microTopicName&&i.jsx("span",{className:"exam-tag",style:{background:"var(--blue-bg)",color:"var(--blue)"},children:"🎯 "+ee.microTopicName}),ee.shift&&i.jsx("span",{className:"exam-tag",style:{background:"var(--surface-subtle)",color:"var(--text-muted)"},children:"📅 "+ee.shift})]})';

if (oldDrawerTagRe.test(html)) {
  html = html.replace(oldDrawerTagRe, newDrawerTag);
  console.log("Updated question drawer to display micro-topic and shift badges.");
} else {
  console.log("oldDrawerTagRe not matched or already updated.");
}

await fs.writeFile(indexPath, html, "utf8");
console.log("Successfully wrote updated index.html.");
