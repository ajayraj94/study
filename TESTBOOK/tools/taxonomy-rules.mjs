import fs from "node:fs/promises";
import path from "node:path";

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
  let confidence = 0.90;
  let format = "standard";

  // ==========================================
  // REASONING CLASSIFICATION
  // ==========================================
  if (subjectId === "reasoning") {
    if (stem.includes("mirror image") || stem.includes("water image") || allText.includes("mirror image")) {
      format = "image-reflection";
      microTopicId = allText.includes("letter") || /[a-z0-9]{3,}/i.test(stem) ? "nv-mirror-text" : "nv-mirror-figure";
    } else if (stem.includes("paper") && (stem.includes("fold") || stem.includes("cut") || stem.includes("unfold"))) {
      format = "non-verbal-paper";
      microTopicId = "nv-paper-fold-cut";
    } else if (stem.includes("embedded") || stem.includes("hidden") || stem.includes("rotation is not allowed")) {
      format = "non-verbal-embedded";
      microTopicId = "nv-embedded-figure";
    } else if (stem.includes("dice") || stem.includes("cube") || stem.includes("opposite to the face")) {
      format = "cubes-dice";
      microTopicId = stem.includes("sheet") || stem.includes("open") ? "nv-dice-open-sheet" : "nv-dice-opposite-standard";
    } else if (stem.includes("interchanging the two signs") || stem.includes("interchange of signs") || stem.includes("interchanging the signs") || stem.includes("signs should be interchanged")) {
      format = "equation-balance";
      microTopicId = "math-sign-interchange";
    } else if (stem.includes("interchanging the two numbers") || stem.includes("interchange of numbers")) {
      format = "equation-balance";
      microTopicId = "math-num-interchange";
    } else if (stem.includes("mathematical signs") && stem.includes("correct the given equation") || stem.includes("bodmas")) {
      format = "equation-balance";
      microTopicId = "math-bodmas-equation";
    } else if (stem.includes("syllogism") || (stem.includes("statement") && (allText.includes("some ") || allText.includes("all ") || allText.includes("no "))) && stem.includes("conclusion")) {
      format = "deductive-statements";
      microTopicId = allText.includes("only a few") || allText.includes("few") ? "syl-only-few" : allText.includes("possibility") ? "syl-possibility" : "syl-standard-23";
    } else if (stem.includes("blood relation") || allText.includes("mother") || allText.includes("father") || allText.includes("brother") || allText.includes("sister") || allText.includes("daughter") || allText.includes("son")) {
      format = "blood-relation";
      if (stem.includes("+") || stem.includes("-") || stem.includes("&") || stem.includes("#") || stem.includes("@")) {
        microTopicId = "blood-coded";
      } else if (stem.includes("pointing") || stem.includes("photograph") || stem.includes("portrait")) {
        microTopicId = "blood-pointing";
      } else {
        microTopicId = "blood-family-tree";
      }
    } else if (stem.includes("direction") || stem.includes("north") || stem.includes("south") || stem.includes("east") || stem.includes("west") || stem.includes("turned left") || stem.includes("turned right")) {
      format = "spatial-navigation";
      microTopicId = stem.includes("shadow") || stem.includes("degree") ? "dir-shadow-angle" : "dir-turns-displacement";
    } else if (stem.includes("venn diagram") || stem.includes("diagram represents") || stem.includes("circles represents")) {
      format = "venn-diagram";
      microTopicId = allText.includes("how many") || /\d+/.test(stem) ? "venn-geometric-overlap" : "venn-logical-classes";
    } else if (stem.includes("seated") || stem.includes("sitting around") || stem.includes("circular table") || stem.includes("straight row") || stem.includes("rank") || stem.includes("order")) {
      format = "seating-order";
      microTopicId = stem.includes("circular") || stem.includes("circle") ? "seating-circular" : stem.includes("rank") ? "rank-linear-order" : "seating-linear-row";
    } else if (stem.includes("series") || stem.includes("replace the question mark (?) in the following series")) {
      format = "series";
      if (allText.includes("letter-cluster") || allText.includes("letter series") || /[a-z]{2,}\s*,\s*[a-z]{2,}/i.test(stem)) {
        microTopicId = "let-ser-cluster";
      } else if (/\d+\s*,\s*\d+\s*,\s*\d+/.test(stem)) {
        microTopicId = allText.includes("double difference") ? "num-ser-double-diff" : allText.includes("cube") || allText.includes("square") ? "num-ser-square-cube" : "num-ser-diff";
      } else {
        microTopicId = "let-ser-continuous";
      }
    } else if (stem.includes("coded as") || stem.includes("written as") || stem.includes("code for") || stem.includes("coded language")) {
      format = "coding-decoding";
      if (allText.includes("is coded as '") && allText.includes("means '")) {
        microTopicId = "code-chinese-decipher";
      } else if (/\d+/.test(opts) || /\d+/.test(stem)) {
        microTopicId = "code-pos-sum";
      } else if (allText.includes("opposite")) {
        microTopicId = "code-opposite-letter";
      } else {
        microTopicId = "code-direct-shift";
      }
    } else if (stem.includes("odd one out") || stem.includes("four letter-clusters") || stem.includes("four number-pairs") || stem.includes("three are alike") || stem.includes("select the odd")) {
      format = "odd-one-out";
      if (stem.includes("number") || /\d+/.test(stem)) {
        microTopicId = "odd-number";
      } else if (stem.includes("letter") || /[a-z]{2,}/i.test(opts)) {
        microTopicId = "odd-letter";
      } else {
        microTopicId = "odd-word";
      }
    } else if (stem.includes("::") || stem.includes("related to") || stem.includes("related word") || stem.includes("related letter") || stem.includes("related number") || stem.includes("select the set")) {
      format = "analogy";
      if (stem.includes("set in which the numbers") || /\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/.test(stem)) {
        microTopicId = "num-triplet-set";
      } else if (allText.includes("si unit") || allText.includes("unit of") || allText.includes("power") || allText.includes("pascal") || allText.includes("watt") || allText.includes("measured in")) {
        microTopicId = "word-unit-measure";
      } else if (allText.includes("capital") || allText.includes("currency") || allText.includes("river") || allText.includes("originates") || allText.includes("mekong") || allText.includes("amazon")) {
        microTopicId = "word-geo-capital";
      } else if (allText.includes("instrument") || allText.includes("thermometer") || allText.includes("barometer")) {
        microTopicId = "word-instrument-measure";
      } else if (allText.includes("square") || allText.includes("cube") || /\d+\s*:\s*\d+/.test(stem)) {
        microTopicId = "num-square-cube";
      } else if (/[a-z]{2,}\s*:\s*[a-z]{2,}/i.test(stem)) {
        microTopicId = "let-position-shift";
      } else {
        microTopicId = "word-synonym-antonym";
      }
    } else {
      microTopicId = "num-triplet-set";
      confidence = 0.85;
    }
  }

  // ==========================================
  // GENERAL AWARENESS CLASSIFICATION
  // ==========================================
  else if (subjectId === "ga") {
    format = "gk-fact";
    if (allText.includes("dance") || allText.includes("kathak") || allText.includes("bharatnatyam") || allText.includes("kuchipudi") || allText.includes("mohiniyattam") || allText.includes("sattriya") || allText.includes("odissi") || allText.includes("manipuri") || allText.includes("folk dance")) {
      microTopicId = "ga-art-classical-folk-dance";
    } else if (allText.includes("gharana") || allText.includes("sitar") || allText.includes("tabla") || allText.includes("sarod") || allText.includes("shehnai") || allText.includes("flute") || allText.includes("musical instrument") || allText.includes("vocalist") || allText.includes("musician")) {
      microTopicId = "ga-art-music-gharanas";
    } else if (allText.includes("festival") || allText.includes("fair") || allText.includes("celebrated") || allText.includes("harvest") || allText.includes("bihu") || allText.includes("hornbill") || allText.includes("pongal") || allText.includes("onam")) {
      microTopicId = "ga-art-festivals-fairs";
    } else if (allText.includes("cave") || allText.includes("temple") || allText.includes("architecture") || allText.includes("elephanta") || allText.includes("ajanta") || allText.includes("ellora") || allText.includes("stupa") || allText.includes("unesco world heritage") || allText.includes("sculptur") || allText.includes("nagara") || allText.includes("dravida")) {
      microTopicId = "ga-art-temple-architecture";
    } else if (allText.includes("article 1") || allText.includes("article 2") || allText.includes("article 3") || allText.includes("fundamental rights") || allText.includes("habeas corpus") || allText.includes("mandamus") || allText.includes("writs") || allText.includes("equality before law") || allText.includes("freedom of speech") || allText.includes("article 32") || allText.includes("article 21")) {
      microTopicId = allText.includes("writ") ? "ga-pol-fr-writs" : allText.includes("article 14") || allText.includes("equality") ? "ga-pol-fr-equality" : "ga-pol-fr-freedom";
    } else if (allText.includes("dpsp") || allText.includes("directive principles") || allText.includes("fundamental duties") || allText.includes("article 51a") || allText.includes("article 36") || allText.includes("article 40") || allText.includes("article 44")) {
      microTopicId = "ga-pol-dpsp-duties";
    } else if (allText.includes("amendment") || allText.includes("preamble") || allText.includes("schedule") || allText.includes("constituent assembly") || allText.includes("borrowed from")) {
      microTopicId = allText.includes("amendment") ? "ga-pol-amendments" : "ga-pol-sources-preamble";
    } else if (allText.includes("president") || allText.includes("governor") || allText.includes("parliament") || allText.includes("lok sabha") || allText.includes("rajya sabha") || allText.includes("supreme court") || allText.includes("high court") || allText.includes("cag") || allText.includes("election commission") || allText.includes("upsc") || allText.includes("attorney general")) {
      microTopicId = allText.includes("president") || allText.includes("governor") ? "ga-pol-president-gov" : allText.includes("parliament") || allText.includes("bill") ? "ga-pol-parliament-state" : "ga-pol-judiciary-bodies";
    } else if (allText.includes("indus valley") || allText.includes("harappa") || allText.includes("mohenjo") || allText.includes("vedic") || allText.includes("rigveda") || allText.includes("buddhis") || allText.includes("jain") || allText.includes("maurya") || allText.includes("ashoka") || allText.includes("gupta") || allText.includes("chola") || allText.includes("pallava")) {
      microTopicId = allText.includes("buddh") || allText.includes("jain") ? "ga-hist-buddhism-jainism" : allText.includes("maurya") || allText.includes("gupta") ? "ga-hist-mauryas-guptas" : allText.includes("chola") || allText.includes("south") ? "ga-hist-south-dynasties" : "ga-hist-indus-vedic";
    } else if (allText.includes("sultanate") || allText.includes("khilji") || allText.includes("tughlaq") || allText.includes("mughal") || allText.includes("akbar") || allText.includes("babur") || allText.includes("aurangzeb") || allText.includes("vijayanagar") || allText.includes("maratha") || allText.includes("shivaji")) {
      microTopicId = allText.includes("mughal") || allText.includes("akbar") ? "ga-hist-mughals" : allText.includes("vijayanagar") || allText.includes("maratha") ? "ga-hist-vijayanagar-marathas" : "ga-hist-delhi-sultanate";
    } else if (allText.includes("1857") || allText.includes("viceroy") || allText.includes("governor-general") || allText.includes("congress") || allText.includes("gandhi") || allText.includes("non-cooperation") || allText.includes("civil disobedience") || allText.includes("quit india") || allText.includes("british")) {
      microTopicId = allText.includes("1857") || allText.includes("viceroy") ? "ga-hist-1857-viceroys" : allText.includes("gandhi") || allText.includes("congress") ? "ga-hist-congress-gandhi" : "ga-hist-freedom-movements";
    } else if (allText.includes("river") || allText.includes("tributary") || allText.includes("dam") || allText.includes("ganga") || allText.includes("indus") || allText.includes("brahmaputra") || allText.includes("godavari") || allText.includes("krishna") || allText.includes("cauvery")) {
      microTopicId = "ga-geo-rivers-dams";
    } else if (allText.includes("mountain") || allText.includes("himalaya") || allText.includes("pass") || allText.includes("peak") || allText.includes("western ghats")) {
      microTopicId = "ga-geo-mountains-passes";
    } else if (allText.includes("national park") || allText.includes("wildlife sanctuary") || allText.includes("biosphere reserve") || allText.includes("ramsar")) {
      microTopicId = "ga-geo-national-parks";
    } else if (allText.includes("monsoon") || allText.includes("soil") || allText.includes("climate") || allText.includes("rainfall")) {
      microTopicId = "ga-geo-monsoon-soils";
    } else if (allText.includes("census") || allText.includes("literacy rate") || allText.includes("population density") || allText.includes("sex ratio")) {
      microTopicId = "ga-geo-census-2011";
    } else if (allText.includes("gdp") || allText.includes("gnp") || allText.includes("national income") || allText.includes("inflation") || allText.includes("cpi") || allText.includes("wpi")) {
      microTopicId = allText.includes("inflation") ? "ga-eco-inflation-money" : "ga-eco-national-income";
    } else if (allText.includes("rbi") || allText.includes("repo rate") || allText.includes("monetary policy") || allText.includes("budget") || allText.includes("tax") || allText.includes("fiscal deficit") || allText.includes("banking")) {
      microTopicId = allText.includes("budget") || allText.includes("tax") ? "ga-eco-budget-taxation" : "ga-eco-rbi-monetary";
    } else if (allText.includes("scheme") || allText.includes("yojana") || allText.includes("five year plan") || allText.includes("niti aayog")) {
      microTopicId = allText.includes("five year") || allText.includes("niti") ? "ga-eco-five-year-plans" : "ga-eco-gov-schemes";
    } else if (allText.includes("si unit") || allText.includes("dimension") || allText.includes("newton") || allText.includes("lens") || allText.includes("mirror") || allText.includes("refraction") || allText.includes("thermodynamics") || allText.includes("electric") || allText.includes("sound wave") || allText.includes("optics")) {
      microTopicId = allText.includes("unit") ? "ga-sci-units-dimensions" : allText.includes("lens") || allText.includes("mirror") || allText.includes("sound") ? "ga-sci-optics-sound" : allText.includes("electric") || allText.includes("heat") ? "ga-sci-heat-electricity" : "ga-sci-motion-gravity";
    } else if (allText.includes("periodic table") || allText.includes("atomic") || allText.includes("acid") || allText.includes("base") || allText.includes("ph value") || allText.includes("metal") || allText.includes("non-metal") || allText.includes("alloy") || allText.includes("polymer") || allText.includes("chemical formula")) {
      microTopicId = allText.includes("periodic") ? "ga-sci-periodic-table" : allText.includes("acid") || allText.includes("base") || allText.includes("ph") ? "ga-sci-acids-bases-salts" : allText.includes("metal") || allText.includes("alloy") ? "ga-sci-metals-carbon" : "ga-sci-everyday-chemistry";
    } else if (allText.includes("cell") || allText.includes("photosynthesis") || allText.includes("plant") || allText.includes("blood") || allText.includes("heart") || allText.includes("hormone") || allText.includes("disease") || allText.includes("vitamin") || allText.includes("bacteria") || allText.includes("virus")) {
      microTopicId = allText.includes("vitamin") || allText.includes("deficiency") ? "ga-sci-vitamins-nutrition" : allText.includes("disease") || allText.includes("bacteria") || allText.includes("virus") ? "ga-sci-diseases-immunity" : allText.includes("plant") || allText.includes("photosynthesis") ? "ga-sci-plant-kingdom" : allText.includes("cell") ? "ga-sci-cell-genetics" : "ga-sci-human-physiology";
    } else if (allText.includes("olympic") || allText.includes("asian games") || allText.includes("world cup") || allText.includes("trophy") || allText.includes("tennis") || allText.includes("medal") || allText.includes("stadium") || allText.includes("bharat ratna") || allText.includes("padma") || allText.includes("nobel") || allText.includes("award")) {
      microTopicId = allText.includes("award") || allText.includes("ratna") || allText.includes("padma") || allText.includes("nobel") ? "ga-ca-national-awards" : "ga-ca-sports-awards";
    } else if (allText.includes("book") || allText.includes("author") || allText.includes("written by") || allText.includes("autobiography")) {
      microTopicId = "ga-gk-books-authors";
    } else if (allText.includes("headquarters") || allText.includes("organisation") || allText.includes("organization")) {
      microTopicId = "ga-gk-org-headquarters";
    } else {
      microTopicId = "ga-gk-firsts-records";
      confidence = 0.85;
    }
  }

  // ==========================================
  // QUANTITATIVE APTITUDE CLASSIFICATION
  // ==========================================
  else if (subjectId === "quant") {
    // 1. Data Interpretation
    if (stem.includes("table") || stem.includes("bar graph") || stem.includes("pie chart") || stem.includes("line graph") || allText.includes("study the table") || allText.includes("study the given pie") || allText.includes("study the given bar")) {
      format = "data-interpretation";
      microTopicId = allText.includes("pie") ? "di-pie-chart" : allText.includes("bar") ? "di-bar-graph" : allText.includes("line") ? "di-line-graph" : "di-table-chart";
    }
    // 2. Fractions Ordering
    else if (allText.includes("ascending order") || allText.includes("descending order") || allText.includes("arrange the fractions") || (allText.includes("fraction") && (allText.includes("smallest") || allText.includes("greatest")))) {
      format = "fraction-ordering";
      microTopicId = "num-fraction-compare";
    }
    // 3. Divisibility & Number Properties
    else if (allText.includes("divisible by") || allText.includes("divisibility") || allText.includes("divided by 11") || allText.includes("divided by 72") || allText.includes("divided by 88") || allText.includes("divided by 9")) {
      format = "divisibility-rule";
      microTopicId = "num-divisibility-rules";
    } else if (allText.includes("unit digit") || allText.includes("unit place")) {
      format = "unit-digit";
      microTopicId = "num-unit-digit";
    } else if (allText.includes("number of factors") || allText.includes("total factors") || allText.includes("sum of factors")) {
      format = "factors";
      microTopicId = "num-factors-multiples";
    } else if (allText.includes("trailing zero") || allText.includes("trailing zeroes")) {
      format = "number-system";
      microTopicId = "num-trailing-zeros";
    } else if (allText.includes("remainder when") || allText.includes("remainder theorem")) {
      format = "remainder";
      microTopicId = "num-remainder-theorems";
    } else if (allText.includes("lcm") || allText.includes("hcf") || allText.includes("greatest common divisor")) {
      format = "lcm-hcf";
      microTopicId = "num-lcm-hcf";
    }
    // 4. Simplification & BODMAS
    else if (/^\s*(simplify|evaluate)\s*:/i.test(stem) || allText.includes("bodmas") || allText.includes("order of operations") || (stem.includes("value of") && /[\{\[\(\]\}\+\-\*\/]/.test(stem) && !stem.includes("theta") && !stem.includes("sin"))) {
      format = "simplification-bodmas";
      microTopicId = "num-surds-indices";
    }
    // 5. Genuine Trigonometry (Precise Regex!)
    else if (/(\\[sct][a-z]{2,5}|sin\^2|cos\^2|tan\^2|sec\^2|cot\^2|cosec\^2|\bsin\s*θ|\bcos\s*θ|\btan\s*θ|\bsec\s*θ|\bcot\s*θ|\btrigonometr|elevation|depression|\bheight\s+of\s+the\s+tower\b)/i.test(allText)) {
      format = "trigonometry";
      if (allText.includes("elevation") || allText.includes("depression") || allText.includes("height of the tower")) {
        microTopicId = "trig-angles-elevation";
      } else if (allText.includes("maximum") || allText.includes("minimum")) {
        microTopicId = "trig-max-min";
      } else if (allText.includes("90°") || allText.includes("complementary")) {
        microTopicId = "trig-complementary-angles";
      } else {
        microTopicId = "trig-pythagorean-identities";
      }
    }
    // 6. Algebra (Cubic & Identities & Linear Equations)
    else if (/\b([a-z]\s*\+\s*1\s*\/\s*[a-z]|[a-z]\^2\s*\+\s*1\s*\/\s*[a-z]\^2|y\s*=\s*mx|[0-9a-z]\s*\^\s*3\s*[\+\-]\s*[0-9a-z]\s*\^\s*3|a\^3\s*\+\s*b\^3\s*\+\s*c\^3|quadratic\s+equation|linear\s+equation|polynomial)\b/i.test(allText) || /y\s*=\s*mx\s*\+\s*\d+/.test(stem) || /\d+\s*\^\s*3\s*\+\s*\d+\s*\^\s*3/.test(stem)) {
      format = "algebra";
      if (/y\s*=\s*mx/i.test(stem) || allText.includes("linear equation")) {
        microTopicId = "alg-linear-two-var";
      } else if (/\^\s*3/i.test(stem) || allText.includes("a^3") || allText.includes("3abc")) {
        microTopicId = "alg-a3-b3-c3";
      } else if (allText.includes("quadratic")) {
        microTopicId = "alg-quadratic-roots";
      } else {
        microTopicId = "alg-x-plus-reciprocal";
      }
    }
    // 7. Dishonest Shopkeeper
    else if (allText.includes("dishonest") || allText.includes("faulty weight") || allText.includes("false weight") || allText.includes("cheats") || allText.includes("uses a weight of")) {
      format = "dishonest-trade";
      microTopicId = allText.includes("markup") ? "pl-dishonest-markup-weight" : "pl-dishonest-weights";
    }
    // 8. Discount & Marked Price
    else if (allText.includes("discount") || allText.includes("marked price") || allText.includes("list price") || (allText.includes("buy ") && allText.includes("get "))) {
      format = "discount";
      microTopicId = (allText.includes("buy ") && allText.includes("get ")) ? "pl-buy-x-get-y" : allText.includes("successive discount") ? "pl-successive-discount" : "pl-cp-mp-relation";
    }
    // 9. Profit & Loss
    else if (allText.includes("cost price") || allText.includes("selling price") || allText.includes("profit") || (allText.includes("loss") && !allText.includes("glossary"))) {
      format = "profit-loss";
      microTopicId = (allText.includes("cost price of") && allText.includes("selling price of")) ? "pl-multiple-articles" : (allText.includes("sells two") && allText.includes("same price")) ? "pl-gain-loss-equal" : "pl-basic-cpsp";
    }
    // 10. Interest (Compound & Simple)
    else if (allText.includes("compound interest") || allText.includes("compounded annually") || allText.includes("compounded half-yearly") || allText.includes("difference between compound") || allText.includes("difference between ci and si")) {
      format = "compound-interest";
      microTopicId = allText.includes("difference between") ? "ci-si-difference" : allText.includes("installment") ? "ci-installments" : "ci-compounding-periods";
    } else if (allText.includes("simple interest") || allText.includes("invested at simple") || (allText.includes("sum becomes") && allText.includes("years"))) {
      format = "simple-interest";
      microTopicId = allText.includes("times") ? "si-sum-n-times" : "si-basic-formula";
    }
    // 11. Time & Work & Pipes
    else if (allText.includes("time and work") || allText.includes("alone can complete") || allText.includes("together can complete") || allText.includes("leaves the work") || allText.includes("alternate day") || (allText.includes("complete a task in") && allText.includes("days")) || (allText.includes("men") && allText.includes("women") && allText.includes("days"))) {
      format = "time-work";
      if (allText.includes("men") && (allText.includes("women") || allText.includes("boys"))) {
        microTopicId = "tw-men-women-days";
      } else if (allText.includes("alternate")) {
        microTopicId = "tw-alternate-days";
      } else if (allText.includes("left") || allText.includes("leaves")) {
        microTopicId = "tw-leaving-joining";
      } else if (allText.includes("wages") || allText.includes("rupees") || allText.includes("share")) {
        microTopicId = "tw-wages-distribution";
      } else {
        microTopicId = "tw-efficiency-individual";
      }
    } else if (allText.includes("pipe") || allText.includes("cistern") || allText.includes("leak") || allText.includes("filling a tank") || allText.includes("fill the tank")) {
      format = "pipes-cistern";
      microTopicId = allText.includes("leak") ? "pipe-leak-emptying" : allText.includes("alternate") ? "pipe-alternating" : "pipe-inlet-outlet";
    }
    // 12. Speed, Time, Distance, Trains, Boats & Races
    else if (allText.includes("train") || allText.includes("platform") || allText.includes("crossing a pole") || (allText.includes("bridge") && allText.includes("speed"))) {
      format = "trains";
      microTopicId = allText.includes("two trains") ? "trn-two-trains" : "trn-crossing-pole-platform";
    } else if (allText.includes("boat") || allText.includes("stream") || allText.includes("upstream") || allText.includes("downstream") || allText.includes("still water")) {
      format = "boats-streams";
      microTopicId = "boat-upstream-downstream";
    } else if (allText.includes("race") || allText.includes("head start") || allText.includes("beats by") || allText.includes("circular track")) {
      format = "races";
      microTopicId = "race-linear-circular";
    } else if (allText.includes("average speed") || allText.includes("relative speed") || allText.includes("stoppage") || (allText.includes("speed") && allText.includes("distance")) || allText.includes("km/h") || (allText.includes("travel at") && allText.includes("speed"))) {
      format = "speed-time-distance";
      microTopicId = allText.includes("average speed") ? "spd-average-speed" : allText.includes("stoppage") ? "spd-stoppage-time" : "spd-relative-speed";
    }
    // 13. Partnership & Ages & Ratio & Mixture
    else if (allText.includes("partner") || (allText.includes("invest") && allText.includes("business") && allText.includes("months"))) {
      format = "partnership";
      microTopicId = "part-simple-compound";
    } else if (allText.includes("ratio of ages") || (allText.includes("years ago") && allText.includes("ratio"))) {
      format = "ages";
      microTopicId = "age-ratio-problems";
    } else if (allText.includes("mixture") || allText.includes("alligation") || allText.includes("replacement") || (allText.includes("blended") && allText.includes("per kg")) || allText.includes("alloy")) {
      format = "mixture-alligation";
      microTopicId = allText.includes("replacement") ? "mix-replacement-liquid" : allText.includes("alloy") ? "mix-two-three-alloys" : "mix-alligation-rule";
    } else if (allText.includes("mean proportional") || allText.includes("third proportional") || allText.includes("fourth proportional") || allText.includes("coins") || allText.includes("ratio")) {
      format = "ratio";
      microTopicId = allText.includes("proportional") ? "ratio-mean-third-fourth" : allText.includes("coin") ? "ratio-coins-denominations" : "ratio-income-expenditure";
    }
    // 14. Mensuration 2D & 3D
    else if (allText.includes("cylinder") || allText.includes("cone") || allText.includes("sphere") || allText.includes("hemisphere") || allText.includes("cuboid") || allText.includes("cube") || allText.includes("frustum") || allText.includes("prism") || allText.includes("pyramid") || allText.includes("volume") || allText.includes("curved surface") || allText.includes("total surface")) {
      format = "mensuration-3d";
      microTopicId = (allText.includes("sphere") || allText.includes("hemisphere")) ? "mens-sphere-hemisphere" : (allText.includes("cylinder") || allText.includes("cone")) ? "mens-cylinder-cone" : "mens-cuboid-cube";
    } else if (allText.includes("pizza") || allText.includes("ring-shaped") || allText.includes("wheel") || allText.includes("area of triangle") || allText.includes("perimeter") || allText.includes("radius of circle") || allText.includes("sector") || allText.includes("pathway") || allText.includes("circumference")) {
      format = "mensuration-2d";
      microTopicId = (allText.includes("sector") || allText.includes("wheel") || allText.includes("pizza")) ? "mens-circle-sector" : allText.includes("triangle") ? "mens-triangles-area" : "mens-shaded-regions";
    }
    // 15. Geometry (Circles & Triangles)
    else if (allText.includes("tangent") || allText.includes("secant") || allText.includes("chord") || allText.includes("cyclic") || allText.includes("incenter") || allText.includes("circumcenter") || allText.includes("orthocenter") || allText.includes("centroid") || allText.includes("similar triangle") || allText.includes("circle with center") || allText.includes("rhombus") || allText.includes("trapezium") || allText.includes("polygon")) {
      format = "geometry";
      if (allText.includes("common tangent")) {
        microTopicId = "geom-common-tangents";
      } else if (allText.includes("tangent") || allText.includes("secant")) {
        microTopicId = "geom-tangent-secant";
      } else if (allText.includes("cyclic")) {
        microTopicId = "geom-cyclic-quad";
      } else if (allText.includes("incenter") || allText.includes("circumcenter") || allText.includes("orthocenter") || allText.includes("centroid")) {
        microTopicId = "geom-triangle-centers";
      } else if (allText.includes("similar") || allText.includes("congruen")) {
        microTopicId = "geom-similarity-thales";
      } else if (allText.includes("rhombus") || allText.includes("trapezium") || allText.includes("polygon")) {
        microTopicId = allText.includes("polygon") ? "geom-regular-polygons" : "geom-rhombus-trapezium";
      } else {
        microTopicId = "geom-chord-properties";
      }
    }
    // 16. Percentages & Averages
    else if (allText.includes("%") || allText.includes("percent") || allText.includes("average") || allText.includes("population") || allText.includes("depreciation")) {
      format = "percentage";
      microTopicId = allText.includes("successive") ? "pct-successive-formula" : allText.includes("consumption") || allText.includes("expenditure") ? "pct-price-consumption" : allText.includes("population") || allText.includes("depreciation") ? "pct-depreciation-population" : "pct-fraction-conv";
    } else {
      microTopicId = "num-fraction-compare";
      confidence = 0.85;
    }
  }

  // ==========================================
  // ENGLISH COMPREHENSION CLASSIFICATION
  // ==========================================
  else if (subjectId === "english") {
    if (stem.includes("passive voice") || stem.includes("active voice")) {
      format = "voice";
      microTopicId = stem.includes("imperative") || allText.includes("let ") ? "eng-voice-imperative" : stem.includes("?") ? "eng-voice-interrogative" : "eng-voice-assertive";
    } else if (stem.includes("indirect speech") || stem.includes("direct speech") || stem.includes("narration")) {
      format = "narration";
      microTopicId = stem.includes("?") || allText.includes("asked") ? "eng-narr-interrogative" : stem.includes("exclaim") || stem.includes("order") ? "eng-narr-imperative-exclam" : "eng-narr-assertive";
    } else if (stem.includes("synonym") || stem.includes("similar in meaning")) {
      format = "synonym";
      microTopicId = "eng-vocab-synonym";
    } else if (stem.includes("antonym") || stem.includes("opposite in meaning")) {
      format = "antonym";
      microTopicId = "eng-vocab-antonym";
    } else if (stem.includes("idiom") || stem.includes("idiomatic")) {
      format = "idiom";
      microTopicId = allText.includes("dog") || allText.includes("cat") || allText.includes("bull") || allText.includes("blue") || allText.includes("red") ? "eng-idiom-nature-animals" : "eng-idiom-actions";
    } else if (stem.includes("one word") || stem.includes("group of words")) {
      format = "one-word-substitution";
      microTopicId = allText.includes("phobia") || allText.includes("mania") ? "eng-ows-phobias-manias" : allText.includes("government") || allText.includes("cracy") ? "eng-ows-gov-society" : "eng-ows-specialists";
    } else if (stem.includes("correctly spelt") || stem.includes("incorrectly spelt") || stem.includes("spelling")) {
      format = "spelling";
      microTopicId = "eng-spell-double-consonant";
    } else if (stem.includes("rearrange") || stem.includes("para jumble") || stem.includes("given sentences") || /\b[A-D]{4}\b/.test(opts)) {
      format = "para-jumbles";
      microTopicId = "eng-jumble-mandatory-pairs";
    } else if (allText.includes("comprehension") && allText.includes("passage") && (q.passage && q.passage.length > 100)) {
      format = "reading-comprehension";
      microTopicId = allText.includes("theme") || allText.includes("title") || allText.includes("tone") ? "eng-rc-inference-title" : "eng-rc-factual";
    } else if (stem.includes("blank no.") || (stem.includes("blank") && q.passage)) {
      format = "cloze-test";
      microTopicId = allText.includes("preposition") || allText.includes("tense") || allText.includes("verb") ? "eng-cloze-grammar" : "eng-cloze-vocabulary";
    } else if (stem.includes("error") || stem.includes("grammatical error") || stem.includes("sentence improvement") || stem.includes("substitute the underlined") || stem.includes("no substitution required")) {
      format = "spotting-error";
      if (allText.includes("subject-verb") || allText.includes("singular") || allText.includes("plural") || allText.includes("neither") || allText.includes("either") || allText.includes("each") || allText.includes("every")) {
        microTopicId = "eng-sva-singular-plural";
      } else if (allText.includes("tense") || allText.includes("had") || allText.includes("conditional") || allText.includes("since")) {
        microTopicId = "eng-tense-perfect-past";
      } else if (allText.includes("preposition") || allText.includes("phrasal verb")) {
        microTopicId = "eng-prep-fixed";
      } else {
        microTopicId = "eng-modifiers-conjunctions";
      }
    } else {
      microTopicId = "eng-cloze-vocabulary";
      confidence = 0.85;
    }
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
