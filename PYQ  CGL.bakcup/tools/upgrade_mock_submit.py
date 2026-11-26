with open('pyq cgl.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_func = '''function zzApplyMockResult(setProgress, save, sections, mockNum, answers, getQ){
  setProgress(prev => {
    const next = Object.assign({}, prev);
    Object.keys(answers).forEach(qnStr => {
      const picked = answers[qnStr];
      if (picked == null) return;
      const qn = Number(qnStr);
      const sec = sections.find(s => qn >= s.qRange[0] && qn <= s.qRange[1]) || sections[0];
      if (!sec) return;
      const key = "M" + mockNum + "-Q" + qn;
      const item = getQ(mockNum, qn, sec.id, 0);
      const ok = item && picked === item.correctIndex;
      const prevMeta = next[key] || zzBlankMeta();
      next[key] = Object.assign({}, prevMeta, {
        selectedOption: picked,
        status: ok ? "mastered" : "weak",
        due: !ok,
        lastAttemptedAt: Date.now()
      });
    });
    return next;
  });
  save();
}'''

new_func = '''function zzApplyMockResult(setProgress, save, sections, mockNum, answers, getQ){
  const nextQuestions = {};
  const secStats = {
    reasoning: { name: "Reasoning", right: 0, wrong: 0, attempted: 0, unattempted: 0, marks: 0 },
    ga: { name: "General Awareness", right: 0, wrong: 0, attempted: 0, unattempted: 0, marks: 0 },
    quant: { name: "Quantitative Aptitude", right: 0, wrong: 0, attempted: 0, unattempted: 0, marks: 0 },
    english: { name: "English", right: 0, wrong: 0, attempted: 0, unattempted: 0, marks: 0 }
  };
  let totalAttempted = 0;
  let totalRight = 0;
  let totalWrong = 0;

  for (let qn = 1; qn <= 100; qn++) {
    const sec = sections.find(s => qn >= s.qRange[0] && qn <= s.qRange[1]) || sections[0];
    const sId = (sec && sec.id) || (qn <= 25 ? "reasoning" : qn <= 50 ? "ga" : qn <= 75 ? "quant" : "english");
    const item = getQ(mockNum, qn, sId, 0);
    const picked = answers[String(qn)] != null ? answers[String(qn)] : answers[qn];
    const key = "M" + mockNum + "-Q" + qn;

    if (picked != null) {
      totalAttempted++;
      if (secStats[sId]) secStats[sId].attempted++;
      const ok = item && picked === item.correctIndex;
      if (ok) {
        totalRight++;
        if (secStats[sId]) secStats[sId].right++;
      } else {
        totalWrong++;
        if (secStats[sId]) secStats[sId].wrong++;
      }
      nextQuestions[key] = {
        selectedOption: picked,
        status: ok ? "mastered" : "weak",
        due: !ok,
        lastAttemptedAt: Date.now()
      };
    } else {
      if (secStats[sId]) secStats[sId].unattempted++;
    }
  }

  Object.keys(secStats).forEach(id => {
    const s = secStats[id];
    s.marks = Math.round(((s.right * 2) - (s.wrong * 0.5)) * 10) / 10;
  });
  const netScore = Math.round(((totalRight * 2) - (totalWrong * 0.5)) * 10) / 10;
  const unattempted = 100 - totalAttempted;
  const accuracy = totalAttempted > 0 ? Math.round((totalRight / totalAttempted) * 100) : 0;

  const mockSummary = {
    mockNum: mockNum,
    submitted: true,
    submittedAt: Date.now(),
    totalAttempted: totalAttempted,
    unattempted: unattempted,
    totalRight: totalRight,
    totalWrong: totalWrong,
    netScore: netScore,
    accuracy: accuracy,
    sections: secStats
  };

  try {
    const allResults = JSON.parse(localStorage.getItem("SSC_MOCK_RESULTS") || "{}");
    allResults[mockNum] = mockSummary;
    localStorage.setItem("SSC_MOCK_RESULTS", JSON.stringify(allResults));
    window.SSC_MOCK_RESULTS = allResults;
    window.dispatchEvent(new CustomEvent("zz:mock-submitted", { detail: mockSummary }));
    window.dispatchEvent(new CustomEvent("zz:progress-updated", { detail: mockSummary }));
  } catch(e) {
    console.error("Failed to save mock summary", e);
  }

  setProgress(prev => {
    const next = Object.assign({}, prev);
    Object.keys(nextQuestions).forEach(k => {
      const prevMeta = next[k] || zzBlankMeta();
      next[k] = Object.assign({}, prevMeta, nextQuestions[k]);
    });
    try {
      localStorage.setItem("SSC_CGL_PROGRESS_BACKUP", JSON.stringify(next));
      window.SSC_PROGRESS = next;
    } catch(e) {}
    return next;
  });
  save();
}'''

assert old_func in content, "old_func not found in pyq cgl.html"
content = content.replace(old_func, new_func, 1)

with open('pyq cgl.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully upgraded zzApplyMockResult in pyq cgl.html!")

