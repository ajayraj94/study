// Structure-aware Quantitative Aptitude classifier.
// Ordered by specificity: a question that mentions both "discount" and "%"
// is a discount question, not a percentage question.

const clean = s => String(s || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#39;|&quot;|&amp;/g, " ")
  .replace(/&radic;/g, " sqrt ").replace(/&times;/g, " x ").replace(/&divide;/g, " / ")
  .replace(/&pi;/g, " pi ").replace(/&deg;/g, " degree ").replace(/&theta;/g, " theta ")
  .replace(/&sup2;/g, "^2").replace(/&sup3;/g, "^3")
  .replace(/\s+/g, " ").trim();
const norm = s => clean(s).toLowerCase();
const has = (t, re) => re.test(t);

export const QUANT_MISC_ID = "quant-misc";

export function classifyQuant({ stem = "", options = {} } = {}) {
  const s = norm(stem);
  const out = (id, format, confidence = 0.9) => ({ microTopicId: id, format, confidence });

  // 1. Data Interpretation
  if (has(s, /table|bar graph|bar chart|pie chart|line graph|line chart|study the (following|given)|data interpretation|given below.*(table|chart|graph)/))
    return out(has(s, /pie/) ? "di-pie-chart" : has(s, /bar/) ? "di-bar-graph" : has(s, /line/) ? "di-line-graph" : "di-table-chart", "data-interpretation");

  // 2. Fractions ordering
  if (has(s, /ascending order|descending order|arrange the fraction|smallest to (the )?largest|largest to (the )?smallest/))
    return out("num-fraction-compare", "fraction-ordering");

  // 3. Trigonometry
  if (/(^|[^a-z])(sin|cos|tan|sec|cot|cosec|sina|cosa|tana|sinθ|cosθ|tanθ)([^a-z]|$)/.test(s) || /θ|theta|radian|trigonometr|elevation|depression/.test(s)) {
    if (has(s, /elevation|depression|height of (the )?tower|top of (the )?building/)) return out("trig-angles-elevation", "trigonometry");
    if (has(s, /radian|degree/)) return out("trig-specific-values", "trigonometry");
    if (has(s, /maximum|minimum|maxima|minima/)) return out("trig-max-min", "trigonometry");
    if (has(s, /90|complementary/)) return out("trig-complementary-angles", "trigonometry");
    if (has(s, /standard (value|angle)/)) return out("trig-specific-values", "trigonometry");
    return out("trig-pythagorean-identities", "trigonometry");
  }

  // 4. Geometry
  if (has(s, /angle|parallel lines|transversal|tangent|secant|chord|cyclic|incenter|incircle|circumcenter|orthocenter|centroid|similar triangle|congruen|polygon|rhombus|trapezium|theorem/)) {
    if (has(s, /common tangent/)) return out("geom-common-tangents", "geometry");
    if (has(s, /tangent|secant/)) return out("geom-tangent-secant", "geometry");
    if (has(s, /cyclic/)) return out("geom-cyclic-quad", "geometry");
    if (has(s, /incenter|circumcenter|orthocenter|centroid|incircle/)) return out("geom-triangle-centers", "geometry");
    if (has(s, /similar|congruen|thales|midpoint/)) return out("geom-similarity-thales", "geometry");
    if (has(s, /polygon/)) return out("geom-regular-polygons", "geometry");
    if (has(s, /rhombus|trapezium|parallelogram/)) return out("geom-rhombus-trapezium", "geometry");
    if (has(s, /chord/)) return out("geom-chord-properties", "geometry");
    if (has(s, /parallel lines|transversal|alternate angle|corresponding angle/)) return out("geom-parallel-angles", "geometry");
  }

  // 5. Mensuration 3D
  if (has(s, /cube|cuboid|cylinder|cone|frustum|sphere|hemisphere|prism|pyramid|volume|surface area|melted|recast|capacity of (a|the) (tank|vessel|container)/)) {
    if (has(s, /sphere|hemisphere|ball/)) return out("mens-sphere-hemisphere", "mensuration-3d");
    if (has(s, /cylinder|cone|frustum/)) return out("mens-cylinder-cone", "mensuration-3d");
    if (has(s, /prism|pyramid/)) return out("mens-prism-pyramid", "mensuration-3d");
    return out("mens-cuboid-cube", "mensuration-3d");
  }

  // 6. Mensuration 2D
  if (has(s, /area|perimeter|circumference|radius|diameter|sector|segment|shaded|path(way)?|lawn|pizza|ring-shaped|wheel|triangle/)) {
    if (has(s, /sector|wheel|pizza|circular|ring-shaped|circle/)) return out("mens-circle-sector", "mensuration-2d");
    if (has(s, /shaded|pathway|path|lawn|border/)) return out("mens-shaded-regions", "mensuration-2d");
    if (has(s, /triangle/)) return out("mens-triangles-area", "mensuration-2d");
    return out("mens-circle-sector", "mensuration-2d");
  }

  // 7. Interest
  if (has(s, /compound interest|compounded|annum.*compound|ci\b/)) {
    if (has(s, /difference between (compound|ci) and (simple|si)|difference between ci and si/)) return out("ci-si-difference", "compound-interest");
    if (has(s, /installment|instalment/)) return out("ci-installments", "compound-interest");
    if (has(s, /effective/)) return out("ci-effective-rate", "compound-interest");
    return out("ci-compounding-periods", "compound-interest");
  }
  if (has(s, /simple interest|\bsi\b/)) {
    if (has(s, /times|becomes \d+ times|n times/)) return out("si-sum-n-times", "simple-interest");
    return out("si-basic-formula", "simple-interest");
  }

  // 7b. Mixture & alligation (checked before P&L: "blended and sold" is a mixture item)
  if (has(s, /mixture|alligation|blended|mixed|alloy/))
    return out(has(s, /replacement|replaced/) ? "mix-replacement-liquid" : has(s, /alloy/) ? "mix-two-three-alloys" : "mix-alligation-rule", "mixture-alligation");

  // 8. Profit, loss & discount
  if (has(s, /discount|marked price|mrp|marked at|successive discount/)) {
    if (has(s, /buy \d+ get \d+|buy one get/)) return out("pl-buy-x-get-y", "discount");
    if (has(s, /successive/)) return out("pl-successive-discount", "discount");
    if (has(s, /cost price|profit|loss/)) return out("pl-cp-mp-relation", "discount");
    return out("pl-successive-discount", "discount");
  }
  if (has(s, /dishonest|faulty weight|false weight|cheat|uses a weight/))
    return out(has(s, /markup|marks? up/) ? "pl-dishonest-markup-weight" : "pl-dishonest-weights", "dishonest-trade");
  if (has(s, /cost price|selling price|\bcp\b|\bsp\b|\bprofit\b|\bloss\b/)) {
    if (has(s, /cost price of \d+ .*selling price of|articles equal/)) return out("pl-multiple-articles", "profit-loss");
    if (has(s, /same (selling )?price|two .* sold .* same/)) return out("pl-gain-loss-equal", "profit-loss");
    return out("pl-basic-cpsp", "profit-loss");
  }

  // 9. Average (before ratio, since "average ... ratio" is common)
  if (has(s, /\baverage\b|\bmean\b/)) {
    if (has(s, /removed|replaced|added|joined|left|new average|increase|decrease/)) return out("avg-change", "average");
    if (has(s, /weighted|ratio|mixture|different groups|two groups/)) return out("avg-weighted", "average");
    return out("avg-basic", "average");
  }

  // 10. Mixture & alligation
  if (has(s, /mixture|alligation|blend|mixed|solution.*(water|milk)|water.*mixture|replacement/))
    return out(has(s, /replacement|replaced/) ? "mix-replacement-liquid" : has(s, /alloy/) ? "mix-two-three-alloys" : "mix-alligation-rule", "mixture-alligation");

  // 11. Time & work / pipes
  if (has(s, /pipe|cistern|tank|leak|fill(ing)? the/))
    return out(has(s, /leak/) ? "pipe-leak-emptying" : has(s, /alternat/) ? "pipe-alternating" : "pipe-inlet-outlet", "pipes-cistern");
  if (has(s, /complete (the |a )?(work|task|job)|can do a piece of work|efficien|wages|work(ed)? (together|alone)|days? to (finish|complete)/)) {
    if (has(s, /men|women|boys|children/) && has(s, /days/)) return out("tw-men-women-days", "time-work");
    if (has(s, /alternate|every other/)) return out("tw-alternate-days", "time-work");
    if (has(s, /left|leaves|joined after|after \d+ days/)) return out("tw-leaving-joining", "time-work");
    if (has(s, /wages|share|amount received/)) return out("tw-wages-distribution", "time-work");
    return out("tw-efficiency-individual", "time-work");
  }

  // 12. Speed / trains / boats / races
  if (has(s, /train|platform|pole|bridge/)) {
    if (has(s, /two trains|opposite direction|same direction/)) return out("trn-two-trains", "trains");
    return out("trn-crossing-pole-platform", "trains");
  }
  if (has(s, /boat|stream|upstream|downstream|still water/)) return out("boat-upstream-downstream", "boats-streams");
  if (has(s, /race|beats by|head start|circular track/)) return out("race-linear-circular", "races");
  if (has(s, /average speed/) || has(s, /stoppage/)) return out(has(s, /stoppage/) ? "spd-stoppage-time" : "spd-average-speed", "speed-time-distance");
  if (has(s, /speed|km\/h|kmph|distance|travel|relative speed/))
    return out(has(s, /relative|towards each other|same direction/) ? "spd-relative-speed" : "spd-average-speed", "speed-time-distance");

  // 13. Ratio / partnership / ages
  if (has(s, /partnership|share of (the )?profit|profit.*invest|rented a field|utilizes|capital contribution/))
    return out("part-simple-compound", "partnership");
  if (has(s, /age.*(ratio|years)|years ago.*age|present age/)) return out("age-ratio-problems", "ages");
  if (has(s, /ratio|proportion/) || /\d\s*:\s*\d/.test(s)) {
    if (has(s, /mean proportional|third proportional|fourth proportional/)) return out("ratio-mean-third-fourth", "ratio");
    if (has(s, /coins?|notes?|denomination/)) return out("ratio-coins-denominations", "ratio");
    return out("ratio-income-expenditure", "ratio");
  }

  // 14. Algebra
  if ((s.match(/\^\s*3/g) || []).length >= 2 || /a\s*\^\s*3|a3\s*\+|\babc\b/.test(s)) return out("alg-a3-b3-c3", "algebra");
  if (/x\s*\+\s*1\/x|x\s*-\s*1\/x/.test(s)) return out(has(s, /x\s*-\s*1\/x/) ? "alg-x-minus-reciprocal" : "alg-x-plus-reciprocal", "algebra");
  if (has(s, /intercept|slope|equation of (the )?line|passes through|parallel to|perpendicular to/)) return out("alg-linear-two-var", "algebra");
  if (has(s, /quadratic|roots|α|β|alpha|beta/)) return out("alg-quadratic-roots", "algebra");
  if (has(s, /y\s*=\s*m\s*x|linear equation|two variables|solve for x|value of x/)) return out("alg-linear-two-var", "algebra");
  if (has(s, /remainder|factor theorem|polynomial/)) return out("alg-remainder-factor", "algebra");
  if (has(s, /find the value|simplify|evaluate|equal to/) && /[a-z]\^|\^2|\^3/.test(s)) return out("alg-value-putting", "algebra");

  // 15. Number system
  if (has(s, /divisible by|divisibility/)) return out("num-divisibility-rules", "divisibility-rule");
  if (has(s, /unit digit|unit place|last digit/)) return out("num-unit-digit", "unit-digit");
  if (has(s, /number of factors|total factors|factors of|sum of factors/)) return out("num-factors-multiples", "factors");
  if (has(s, /trailing zero/)) return out("num-trailing-zeros", "number-system");
  if (has(s, /remainder/)) return out("num-remainder-theorems", "remainder");
  if (has(s, /lcm|hcf|least common|highest common|greatest number (that|which) divides/)) return out("num-lcm-hcf", "lcm-hcf");
  if (has(s, /sqrt|surd|indices|\\sqrt|power of|exponent/)) return out("num-surds-indices", "simplification-bodmas");
  if (has(s, /simplify|evaluate|calculate|value of|what will come in place|place of the question mark/)) return out("num-surds-indices", "simplification-bodmas");

  // 16. Percentage (last: % appears everywhere)
  if (has(s, /percent|%|increase|decrease|depreciation|population/)) {
    if (has(s, /depreciation|population/)) return out("pct-depreciation-population", "percentage");
    if (has(s, /successive/)) return out("pct-successive-formula", "percentage");
    if (has(s, /consumption|expenditure/)) return out("pct-price-consumption", "percentage");
    if (has(s, /pass|fail|marks/)) return out("pct-exam-passing", "percentage");
    return out("pct-fraction-conv", "percentage");
  }

  return out(QUANT_MISC_ID, "standard", 0.4);
}
