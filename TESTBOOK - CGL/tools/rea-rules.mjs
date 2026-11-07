// Structure-aware Reasoning classifier.
// Every SSC CGL reasoning item states its pattern in the instruction
// ("select the related word", "letter-cluster ... series", "pointing to a man").
// Ordered decision tree over that instruction; options only break ties.

const clean = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#39;|&quot;|&amp;/g, " ").replace(/\s+/g, " ").trim();
const norm = s => clean(s).toLowerCase();
const has = (t, re) => re.test(t);

const ANIMAL = /\b(dog|cat|horse|bull|cow|snake|fish|bird|crow|lion|tiger|elephant|monkey|goat|sheep|pig|hen|duck|wolf|fox|bear|bee|ant|rat|mouse|frog)\b/i;

export const REA_MISC_ID = "rea-misc";

export function classifyReasoning({ stem = "", options = {} } = {}) {
  const s = norm(stem);
  const opts = Object.values(options).map(o => norm(o));
  const optText = opts.join(" ");
  const digitsInStem = (clean(stem).match(/\d+/g) || []).length;
  const clustersInOpts = opts.some(o => /^[a-z]{2,}(\s*[-,]\s*[a-z]{2,}){1,}$/.test(o));
  const symbolsInOpts = opts.some(o => /[#@$%*&^~]/.test(o));

  const out = (id, format, confidence = 0.9) => ({ microTopicId: id, format, confidence });

  // Non-verbal
  if (has(s, /mirror image|water image/))
    return out(/letter|number|alphanumeric/.test(s) ? "nv-mirror-text" : "nv-mirror-figure", "image-reflection");
  if (has(s, /paper.*(fold|cut)|folded.*(cut|punch)|unfold/)) return out("nv-paper-fold-cut", "non-verbal-paper");
  if (has(s, /embedded|hidden|figure is embedded/)) return out("nv-embedded-figure", "non-verbal-embedded");
  if (has(s, /dice|opposite face|open sheet/))
    return out(has(s, /sheet|open/) ? "nv-dice-open-sheet" : "nv-dice-opposite-standard", "cubes-dice");
  if (has(s, /figure series|series of figures|next figure/)) return out("nv-fig-series-rot", "figure-series");
  if (has(s, /venn/)) return out(/\d/.test(s) ? "venn-geometric-overlap" : "venn-logical-classes", "venn-diagram");

  // Deductive
  if (has(s, /assumption/)) return out("crit-statement-assumption", "deductive-statements");
  if (has(s, /statement|conclusion|inference/)) {
    if (has(s, /conclusion|inference|follows/)) {
      if (has(s, /only a few|\bfew\b/)) return out("syl-only-few", "deductive-statements");
      if (has(s, /possibilit|either .* or/)) return out("syl-possibility", "deductive-statements");
      return out(has(s, /\bboth\b.*conclusion|neither .* follows/) || !has(s, /\ball\b|\bsome\b|\bno\b/) ? "crit-statement-conclusion" : "syl-standard-23", "deductive-statements");
    }
    return out("crit-statement-conclusion", "deductive-statements");
  }

  // Blood relations
  if (has(s, /blood relation|pointing|photo|portrait|mother|father|brother|sister|daughter|son|wife|husband|uncle|aunt|nephew|niece|grandfather|grandmother|in-law/)) {
    if (has(s, /[+#$@%&*]/) && has(s, /means/)) return out("blood-coded", "blood-relation");
    if (has(s, /pointing|photo|portrait|said/)) return out("blood-pointing", "blood-relation");
    return out("blood-family-tree", "blood-relation");
  }

  // Direction & seating
  if (has(s, /seated|sitting|immediate left|immediate right|to the left of|to the right of|circular|round table|row of/)) {
    if (has(s, /circular|round table/)) return out("seating-circular", "seating-order");
    return out("seating-linear-row", "seating-order");
  }
  if (has(s, /rank|position from the (left|right)|total number of (persons|students|boys|girls)/))
    return out("rank-linear-order", "seating-order");
  if (has(s, /shadow/) || has(s, /degree|clockwise|anticlockwise/))
    return out("dir-shadow-angle", "spatial-navigation");
  if (has(s, /north|south|east|west|walked|turned|facing/))
    return out("dir-turns-displacement", "spatial-navigation");

  // Coding-decoding
  if (has(s, /coded as|code for|coded to form|coded using|coding|decoded|in a certain code/)) {
    if (has(s, /means/) && has(s, /(word|phrase).*(code|coded)/)) return out("code-chinese-decipher", "coding-decoding");
    if (has(s, /opposite/)) return out("code-opposite-letter", "coding-decoding");
    if (/\d/.test(optText) && digitsInStem < 2) return out("code-pos-sum", "coding-decoding");
    if (symbolsInOpts) return out("code-symbol-map", "coding-decoding");
    return out("code-direct-shift", "coding-decoding");
  }

  // Operator substitution (if # means x ...)
  if (has(s, /if .*(means|=|\bis\b).*(then|evaluate|value)/) && symbolsInOpts)
    return out("math-bodmas-equation", "equation-balance");
  if (has(s, /interchang|balanc(e|ing) the equation/)) {
    if (has(s, /sign/)) return out("math-sign-interchange", "equation-balance");
    if (has(s, /number/)) return out("math-num-interchange", "equation-balance");
    return out("math-bodmas-equation", "equation-balance");
  }

  // Alphabet test (must precede the series rules)
  if (has(s, /alphabetical order|how many (such )?letters|how many letters/))
    return out("let-ser-single", "series");

  // Series
  if (has(s, /series|replace the question mark|comes next|next in the/)) {
    if (has(s, /letter[- ]cluster|letter cluster/) || clustersInOpts) return out("let-ser-cluster", "series");
    if (has(s, /letter series|alphabet series/)) return out("let-ser-single", "series");
    if (digitsInStem >= 3) {
      if (has(s, /square|cube|prime/)) return out("num-ser-square-cube", "series");
      if (has(s, /multiply|×|product|alternat/)) return out("num-ser-mult-alt", "series");
      if (has(s, /difference|double|increas/) || digitsInStem >= 4) return out("num-ser-diff", "series");
      return out("num-ser-diff", "series");
    }
    return out("let-ser-cluster", "series");
  }

  // Odd one out
  if (has(s, /odd one|odd one out|does not belong|are alike|dissimilar|not belong|choose the odd/)) {
    if (/\d/.test(clean(stem)) || /\d/.test(optText)) return out("odd-number", "odd-one-out");
    if (clustersInOpts || lettersOnly(opts)) return out("odd-letter", "odd-one-out");
    if (/[#@$%&*]/.test(optText) || /\d/.test(optText)) return out("odd-number", "odd-one-out");
    return out("odd-word", "odd-one-out");
  }

  // Analogy
  if (has(s, /related word|analogy|is related to|related to the|::|similar relationship|same relationship/)) {
    if (has(s, /si unit|unit of|measured in|power|pressure|temperature|energy|force|quantity/)) return out("word-unit-measure", "analogy");
    if (has(s, /capital|currency|country|river|originates|flows/)) return out("word-geo-capital", "analogy");
    if (has(s, /instrument|barometer|thermometer|hygrometer|lactometer/)) return out("word-instrument-measure", "analogy");
    if (has(s, /worker|profession|tool|occupation/)) return out("word-worker-tool", "analogy");
    if (/\b[A-Z]{1,4}\s*:\s*[A-Z]{1,4}\b/.test(clean(stem))) return out("let-position-shift", "analogy");
    if (clustersInOpts) return out("let-position-shift", "analogy");
    return out("word-synonym-antonym", "analogy");
  }

  // Letter/alphabet manipulation
  if (has(s, /alphabet series|vowel|consonant/)) return out("let-ser-single", "series");
  if (has(s, /opposite letter|reverse alphabet/)) return out("let-opposite-pairs", "analogy");

  // Address / symbol / string matching blocks
  if (has(s, /identical|exactly the same|exactly same|same as the|same address|address(es)? that is|similar(ly)? written/))
    return out("rea-matching", "matching");

  // Word formation / jumbled letters
  if (has(s, /meaningful (word|four-letter|english word)|word (can|which can) be formed|form a meaningful|jumbled letters|unscramble|letters can be rearranged/))
    return out("rea-word-formation", "word-formation");

  // "What comes at the place of the question mark" — decide by option type
  if (has(s, /place of (the )?question mark|come at the place|replace the question mark/)) {
    const numericOpts = opts.length > 0 && opts.every(o => /^[\d.,\s]+$/.test(o.trim()));
    if (numericOpts || /^\d/.test(optText)) return out("num-ser-diff", "series");
    if (clustersInOpts) return out("let-ser-cluster", "series");
    return out("nv-pattern-complete", "figure-series");
  }

  // Operator / symbol substitution ("if + means divided by", "# = x, @ = -")
  if ((/[#@$%&*]/.test(clean(stem)) || has(s, /special character/)) && has(s, /=|means|stands for|denotes|evaluate|replace/))
    return out(has(s, /replace|interchang/) ? "math-sign-interchange" : "math-bodmas-equation", "equation-balance");
  if (has(s, /means|stands for|denotes/) && has(s, /divided|multipl|plus|minus|addition|subtraction|mathematical sign/))
    return out(has(s, /replace|interchang/) ? "math-sign-interchange" : "math-bodmas-equation", "equation-balance");

  // Arithmetic reasoning inside the reasoning section
  if (has(s, /percent|remainder when|increased by|decreased by|is divided by/))
    return out("math-bodmas-equation", "equation-balance");

  // Group-based classification / odd one out (other phrasings)
  if (has(s, /a group of|group of three|does not belong|not like the others|odd one|dissimilar|are alike/))
    return out(/\d/.test(s) ? "odd-number" : "odd-word", "odd-one-out");

  // Alternative-word questions
  if (has(s, /from the given alternative words|find the word which|which of the following words/))
    return out("odd-word", "odd-one-out");

  return out(REA_MISC_ID, "standard", 0.4);
}

function lettersOnly(opts) {
  return opts.length > 0 && opts.every(o => /^[a-z]{1,4}(\s*[-,]\s*[a-z]{1,4})*$/.test(o.trim()));
}
