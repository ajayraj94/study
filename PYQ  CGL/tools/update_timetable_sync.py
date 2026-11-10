with open('timetable.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Define getMockStats and getAllSprintStats before build15DaysSprintHTML
helpers_code = '''
  function getMockStats(mockNum) {
    var prog = (window.zzGetProgress && window.zzGetProgress()) || window.SSC_PROGRESS;
    if (!prog) {
      try {
        var raw = localStorage.getItem("SSC_CGL_PROGRESS_BACKUP");
        if (raw) prog = JSON.parse(raw);
      } catch (e) {}
    }
    if (!prog) {
      return { mockNum: mockNum, attempted: 0, correct: 0, wrong: 0, score: 0, accuracy: 0, status: "unattempted" };
    }

    var attempted = 0;
    var correct = 0;
    var wrong = 0;

    for (var q = 1; q <= 100; q++) {
      var key = "M" + mockNum + "-Q" + q;
      var item = prog[key];
      if (item) {
        if (item.selectedOption != null || item.status === "mastered" || item.status === "weak") {
          attempted++;
        }
        if (item.status === "mastered") {
          correct++;
        } else if (item.status === "weak") {
          wrong++;
        }
      }
    }

    var score = Math.round(((correct * 2) - (wrong * 0.5)) * 10) / 10;
    var accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    var status = "unattempted";
    if (attempted >= 80) status = "completed";
    else if (attempted > 0) status = "in-progress";

    return {
      mockNum: mockNum,
      attempted: attempted,
      correct: correct,
      wrong: wrong,
      score: score,
      accuracy: accuracy,
      status: status
    };
  }

  function getAllSprintStats() {
    var totalMocksAttempted = 0;
    var totalMocksCompleted = 0;
    var totalQsAttempted = 0;
    var totalCorrect = 0;
    var totalWrong = 0;

    for (var m = 1; m <= 45; m++) {
      var s = getMockStats(m);
      if (s.attempted >= 5) totalMocksAttempted++;
      if (s.status === "completed") totalMocksCompleted++;
      totalQsAttempted += s.attempted;
      totalCorrect += s.correct;
      totalWrong += s.wrong;
    }

    var totalScore = Math.round(((totalCorrect * 2) - (totalWrong * 0.5)) * 10) / 10;
    var overallAcc = totalQsAttempted > 0 ? Math.round((totalCorrect / totalQsAttempted) * 100) : 0;

    return {
      mocksAttempted: totalMocksAttempted,
      mocksCompleted: totalMocksCompleted,
      qsAttempted: totalQsAttempted,
      totalCorrect: totalCorrect,
      totalWrong: totalWrong,
      totalScore: totalScore,
      overallAcc: overallAcc
    };
  }

  function renderMockRow(mNum, timeStr, titleStr, descStr, tagStr) {
    var s = getMockStats(mNum);
    var isDone = s.status === "completed";
    var inProg = s.status === "in-progress";

    var workBadge = "";
    var actionBtn = "";
    if (isDone) {
      workBadge = '<span class="zztt-live-work-tag done">✅ ' + s.attempted + '/100 Done · Score: ' + (s.score > 0 ? "+" + s.score : s.score) + ' (' + s.accuracy + '%)</span>';
      actionBtn = '<button type="button" class="zztt-mock-action-btn review" data-mock-num="' + mNum + '">🔍 Review</button>';
    } else if (inProg) {
      workBadge = '<span class="zztt-live-work-tag prog">⚡ ' + s.attempted + '/100 Qs · Score: ' + (s.score > 0 ? "+" + s.score : s.score) + ' (' + s.correct + 'R, ' + s.wrong + 'W)</span>';
      actionBtn = '<button type="button" class="zztt-mock-action-btn resume" data-mock-num="' + mNum + '">⚡ Continue</button>';
    } else {
      workBadge = '<span class="zztt-live-work-tag unattempted">Not Started</span>';
      actionBtn = '<button type="button" class="zztt-mock-action-btn start" data-mock-num="' + mNum + '">▶ Start Test</button>';
    }

    var bar = inProg || isDone
      ? '<div class="zztt-mock-bar"><span style="width:' + s.attempted + '%;background:' + (isDone ? "#10b981" : "#38bdf8") + '"></span></div>'
      : '';

    return (
      '<div class="zztt-mock-row' + (isDone ? " done" : (inProg ? " in-prog" : "")) + '" data-mock-num="' + mNum + '" title="Click to open ' + esc(titleStr) + ' in Exam Mode">' +
      '<span class="zztt-mock-time-pill">' + timeStr + '</span>' +
      '<div class="zztt-mock-details">' +
      '<div class="zztt-mock-title-row">' +
      '<strong class="zztt-mock-title">' + esc(titleStr) + '</strong>' +
      workBadge +
      '</div>' +
      '<span class="zztt-mock-sub">' + descStr + '</span>' +
      bar +
      '</div>' +
      actionBtn +
      '</div>'
    );
  }
'''

# Find build15DaysSprintHTML
old_func_start = code.find('  function build15DaysSprintHTML() {')
old_func_end = code.find('  function buildHTML(group) {')
assert old_func_start != -1 and old_func_end != -1, "Function boundaries not found"

new_build_func = '''  function build15DaysSprintHTML() {
    var completed = getCompletedDays();
    var sprintStats = getAllSprintStats();
    var doneCount = Object.keys(completed).length;
    var donePct = Math.round((doneCount / 15) * 100);

    var phase1Days = SPRINT_15_DAYS.filter(function (d) { return d.phase === 1; });
    var phase2Days = SPRINT_15_DAYS.filter(function (d) { return d.phase === 2; });
    var phase3Days = SPRINT_15_DAYS.filter(function (d) { return d.phase === 3; });

    var daysToShow = SPRINT_15_DAYS;
    if (state.phaseFilter === "p1") daysToShow = phase1Days;
    else if (state.phaseFilter === "p2") daysToShow = phase2Days;
    else if (state.phaseFilter === "p3") daysToShow = phase3Days;

    var filterBar =
      '<div class="zztt-sprint-filters">' +
      '<button class="zztt-filter-btn' + (state.phaseFilter === "all" ? " active" : "") + '" data-pfilter="all">All 15 Days (45 Mocks)</button>' +
      '<button class="zztt-filter-btn' + (state.phaseFilter === "p1" ? " active" : "") + '" data-pfilter="p1">Phase 1: Days 1–5 (Accuracy & Negatives)</button>' +
      '<button class="zztt-filter-btn' + (state.phaseFilter === "p2" ? " active" : "") + '" data-pfilter="p2">Phase 2: Days 6–10 (Speed & Attempts)</button>' +
      '<button class="zztt-filter-btn' + (state.phaseFilter === "p3" ? " active" : "") + '" data-pfilter="p3">Phase 3: Days 11–15 (Peak Simulation)</button>' +
      '</div>';

    var diagnosticBanner =
      '<div class="zztt-diag-banner">' +
      '<div class="zztt-diag-header">' +
      '<div>' +
      '<div class="zztt-diag-kicker">🎯 15-DAY HIGH-INTENSITY SPRINT · 45 FULL MOCKS (3 MOCKS / DAY)</div>' +
      '<div class="zztt-diag-title">Synced with Your Work · Target: 87.5 → 150+ / 200</div>' +
      '<div class="zztt-diag-sub">Click any shift below to launch directly into Exam Mode. Progress, answers, and scores sync automatically in real time.</div>' +
      '</div>' +
      '<div class="zztt-diag-progress-box">' +
      '<div class="zztt-diag-big-num">' + sprintStats.qsAttempted + '<span style="font-size:13px;font-weight:700;opacity:.7"> / 4500 Qs</span></div>' +
      '<div class="zztt-diag-bar"><span style="width:' + Math.min(100, Math.round((sprintStats.qsAttempted / 4500) * 100)) + '%"></span></div>' +
      '<div class="zztt-diag-bar-lbl">' + sprintStats.mocksAttempted + ' of 45 Mocks Active · Net Marks: ' + (sprintStats.totalScore > 0 ? "+" + sprintStats.totalScore : sprintStats.totalScore) + ' (' + sprintStats.overallAcc + '% Acc)</div>' +
      '</div>' +
      '</div>' +
      '<div class="zztt-targets-strip">' +
      '<div class="zztt-target-box" style="--tgt:#0ea5e9">' +
      '<strong>⚡ Quant Target: 42–46+</strong>' +
      '<span>Diagnostic: 19.5 (10 Right, 14 Unattempted). <b>Fix:</b> 2-Round skip rule.</span>' +
      '</div>' +
      '<div class="zztt-target-box" style="--tgt:#6366f1">' +
      '<strong>🎯 Reasoning Target: 44–48+</strong>' +
      '<span>Diagnostic: 18.0 (8 Negatives!). <b>Fix:</b> Zero wild guesses & trap series drill.</span>' +
      '</div>' +
      '<div class="zztt-target-box" style="--tgt:#f59e0b">' +
      '<strong>🛡️ GA / GK Target: 24–30+</strong>' +
      '<span>Diagnostic: 14.5 (7 Negatives!). <b>Fix:</b> Strict 50/50 elimination only.</span>' +
      '</div>' +
      '<div class="zztt-target-box" style="--tgt:#10b981">' +
      '<strong>📖 English Target: 44–48+</strong>' +
      '<span>Diagnostic: 35.5 (18 Right, 95% Acc). <b>Fix:</b> Reading speed & 120 rules.</span>' +
      '</div>' +
      '</div>' +
      '</div>';

    var cardsHTML = daysToShow.map(function (d) {
      var isDone = !!completed[d.day];
      var phaseColor = d.phase === 1 ? "#ec4899" : (d.phase === 2 ? "#3b82f6" : "#10b981");

      var m1Num = (d.day - 1) * 3 + 1;
      var m2Num = (d.day - 1) * 3 + 2;
      var m3Num = (d.day - 1) * 3 + 3;

      var s1 = getMockStats(m1Num);
      var s2 = getMockStats(m2Num);
      var s3 = getMockStats(m3Num);

      var dayAttempted = s1.attempted + s2.attempted + s3.attempted;
      var dayCorrect = s1.correct + s2.correct + s3.correct;
      var dayWrong = s1.wrong + s2.wrong + s3.wrong;
      var dayScore = Math.round(((dayCorrect * 2) - (dayWrong * 0.5)) * 10) / 10;
      var autoCompleted = isDone || (s1.status === "completed" && s2.status === "completed" && s3.status === "completed");

      var dayWorkTag = dayAttempted > 0
        ? '<span class="zztt-day-work-tag">⚡ ' + dayAttempted + '/300 Qs (' + (dayScore > 0 ? "+" + dayScore : dayScore) + ' pts)</span>'
        : '';

      return (
        '<div class="zztt-day-card' + (autoCompleted ? " zztt-day-done" : "") + '" data-day="' + d.day + '">' +
        '<div class="zztt-day-card-header">' +
        '<div class="zztt-day-card-left">' +
        '<span class="zztt-day-badge" style="border-left:3px solid ' + phaseColor + '">Day ' + d.day + '</span>' +
        '<span class="zztt-day-date">' + esc(d.dateStr) + '</span>' +
        '<span class="zztt-day-phase" style="background:' + phaseColor + '1a;color:' + phaseColor + ';border:1px solid ' + phaseColor + '44">' + esc(d.phaseTitle) + '</span>' +
        dayWorkTag +
        '</div>' +
        '<label class="zztt-day-check-wrap' + (autoCompleted ? " done" : "") + '">' +
        '<input type="checkbox" class="zztt-day-checkbox" data-day="' + d.day + '"' + (autoCompleted ? " checked" : "") + ' />' +
        '<span>' + (autoCompleted ? "✓ Completed" : "Mark Day Done") + '</span>' +
        '</label>' +
        '</div>' +

        '<div class="zztt-block-section-title"><span>FULL MOCK TESTS (CLICK TO LAUNCH EXAM)</span></div>' +
        '<div class="zztt-mocks-stack">' +
        renderMockRow(m1Num, "🌅 10:00–11:15", d.m1, "60m strict exam mode · Round-1 direct formula solve", "MOCK 1") +
        renderMockRow(m2Num, "☀️ 14:00–15:15", d.m2, "Afternoon session · Reasoning trap question audit", "MOCK 2") +
        renderMockRow(m3Num, "🌙 19:45–21:00", d.m3, "Evening fatigue test · Speed & accuracy discipline", "MOCK 3") +
        '</div>' +

        '<div class="zztt-block-section-title"><span>REMEDIAL WEAK-AREA DRILLS</span></div>' +
        '<div class="zztt-drills-list">' +
        '<div class="zztt-drill-row" style="--dsub:#0ea5e9">' +
        '<span class="zztt-drill-time">11:45 & 17:45 · 3h</span>' +
        '<div class="zztt-drill-body"><strong>⚡ Quant:</strong> ' + esc(d.drills.qa) + '</div>' +
        '</div>' +
        '<div class="zztt-drill-row" style="--dsub:#6366f1">' +
        '<span class="zztt-drill-time">15:45 · 1.5h</span>' +
        '<div class="zztt-drill-body"><strong>🎯 Reasoning:</strong> ' + esc(d.drills.rea) + '</div>' +
        '</div>' +
        '<div class="zztt-drill-row" style="--dsub:#f59e0b">' +
        '<span class="zztt-drill-time">21:30 · 1.25h</span>' +
        '<div class="zztt-drill-body"><strong>🛡️ GA / GK:</strong> ' + esc(d.drills.ga) + '</div>' +
        '</div>' +
        '<div class="zztt-drill-row" style="--dsub:#10b981">' +
        '<span class="zztt-drill-time">23:00 · 1h</span>' +
        '<div class="zztt-drill-body"><strong>📖 English:</strong> ' + esc(d.drills.eng) + '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }).join("");

    return (
      diagnosticBanner +
      filterBar +
      '<div class="zztt-cards-container">' + cardsHTML + '</div>'
    );
  }
'''

code = code[:old_func_start] + helpers_code + new_build_func + code[old_func_end:]

# Add click handlers for data-mock-num in render()
render_marker = 'Array.prototype.forEach.call(body.querySelectorAll(".zztt-day-checkbox"), function (chk) {'
render_handler = '''    Array.prototype.forEach.call(body.querySelectorAll("[data-mock-num]"), function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        var mNum = parseInt(el.getAttribute("data-mock-num"), 10);
        if (mNum && window.zzOpenExam) {
          hide();
          window.zzOpenExam(mNum, 1, "reasoning", 0, "full");
        }
      });
    });

    '''
assert render_marker in code, "render_marker not found"
code = code.replace(render_marker, render_handler + render_marker, 1)

# Add listener for progress update
init_marker = '  window.zzShowTimetable = show;'
listener_code = '''  window.addEventListener("zz:progress-updated", function () {
    var overlay = document.getElementById("zztt-overlay");
    if (overlay && overlay.getAttribute("data-open") === "1") {
      render();
    }
  });

'''
assert init_marker in code, "init_marker not found"
code = code.replace(init_marker, listener_code + init_marker, 1)

# Add CSS for new elements
css_marker = '".zztt-mock-title{font-size:11.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",'
css_replacement = '''".zztt-mock-row{cursor:pointer;position:relative}",
      ".zztt-mock-row:hover{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.5);box-shadow:0 0 14px rgba(56,189,248,.25)}",
      ".zztt-mock-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}",
      ".zztt-mock-title{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".zztt-live-work-tag{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap}",
      ".zztt-live-work-tag.unattempted{background:rgba(148,163,184,.12);color:rgba(148,163,184,.65)}",
      ".zztt-live-work-tag.prog{background:rgba(56,189,248,.18);color:#38bdf8;border:1px solid rgba(56,189,248,.35)}",
      ".zztt-live-work-tag.done{background:rgba(16,185,129,.2);color:#34d399;border:1px solid rgba(16,185,129,.4)}",
      ".zztt-mock-bar{height:3px;border-radius:99px;background:rgba(148,163,184,.2);margin-top:4px;overflow:hidden}",
      ".zztt-mock-bar span{display:block;height:100%;border-radius:99px;transition:width .3s}",
      ".zztt-mock-action-btn{border:0;font:inherit;font-size:10px;font-weight:800;padding:5px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s}",
      ".zztt-mock-action-btn.start{background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;box-shadow:0 2px 6px rgba(37,99,235,.35)}",
      ".zztt-mock-action-btn.start:hover{background:linear-gradient(135deg,#0369a1,#1d4ed8);transform:scale(1.03)}",
      ".zztt-mock-action-btn.resume{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 2px 6px rgba(245,158,11,.35)}",
      ".zztt-mock-action-btn.resume:hover{background:linear-gradient(135deg,#d97706,#b45309);transform:scale(1.03)}",
      ".zztt-mock-action-btn.review{background:rgba(16,185,129,.18);color:#34d399;border:1px solid rgba(16,185,129,.4)}",
      ".zztt-mock-action-btn.review:hover{background:rgba(16,185,129,.3)}",
      ".zztt-day-work-tag{font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;background:rgba(56,189,248,.18);color:#38bdf8;border:1px solid rgba(56,189,248,.35);white-space:nowrap}",'''

assert css_marker in code, "css_marker not found"
code = code.replace(css_marker, css_replacement, 1)

with open('timetable.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully injected work synchronization into timetable.js!")

