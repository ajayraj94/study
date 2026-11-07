// Structure-aware English classifier.
// SSC CGL English items are templated: the instruction line ("Select the most
// appropriate synonym", "Find the part containing an error", "Rearrange...")
// identifies the type far more reliably than any keyword soup. So this is an
// ordered decision tree over the instruction, with the options and passage used
// only to break ties inside a type.

const ANIMAL_COLOR = /\b(dog|cat|horse|bull|cow|snake|fish|bird|crow|lion|tiger|elephant|monkey|ass|mule|goat|sheep|pig|hen|duck|wolf|fox|bear|bee|ant|rat|mouse|frog|peacock|sparrow|owl|bat|crocodile|blue|red|black|white|green|pink|golden|silver|purple|yellow)\b/i;
const PREPOSITION = /^(about|above|across|after|against|along|amid|among|around|at|before|behind|below|beneath|beside|besides|between|beyond|by|despite|down|during|for|from|in|inside|into|near|of|off|on|onto|outside|over|past|since|through|throughout|till|to|toward|towards|under|until|up|upon|with|within|without)$/i;
const DETERMINER = /^(a|an|the|some|any|much|many|few|little|each|every|either|neither|another|other|such|what|which|whose)$/i;
const VERB_FORM = /\b(is|am|are|was|were|has|have|had|do|does|did|being|been|will|would|shall|should|can|could|may|might|must|\w+ed|\w+ing)\b/i;
const COMPARATIVE = /^(less|more|much|rather|very|too|so|such|most|least|better|best|worse|worst|than)$/i;

const clean = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#39;|&quot;|&amp;/g, " ").replace(/\s+/g, " ").trim();
const norm = s => clean(s).toLowerCase();
const has = (t, re) => re.test(t);

export const ENG_MISC_ID = "eng-misc";

export function classifyEnglish({ stem = "", options = {}, passage = "" } = {}) {
  const s = norm(stem);
  const opts = Object.values(options).map(o => clean(o));
  const optLower = opts.map(o => norm(o));
  const hasPassage = clean(passage).length > 120;
  const optHasPreposition = optLower.some(o => PREPOSITION.test(o));
  const optHasDeterminer = optLower.some(o => DETERMINER.test(o));
  const optHasVerb = optLower.some(o => VERB_FORM.test(o));
  const optHasComparative = optLower.some(o => COMPARATIVE.test(o));

  const out = (id, format, confidence = 0.9) => ({ microTopicId: id, format, confidence });

  // 1. Sentence rearrangement
  if (has(s, /\brearrange|jumbled|coherent paragraph|correct (order|sequence)|logical passage|proper sequence\b/))
    return out("eng-jumble-mandatory-pairs", "para-jumble");

  // 2. Narration
  if (has(s, /(direct|indirect|reported) speech|narration|conveys? the sentence/)) {
    if (has(s, /\basked\b|whether|question mark|interrogative|wh-?word/)) return out("eng-narr-interrogative", "narration");
    if (has(s, /\border(ed)?\b|request(ed)?|exclaim|advised|command|imperative/)) return out("eng-narr-imperative-exclam", "narration");
    return out("eng-narr-assertive", "narration");
  }

  // 3. Voice
  if (has(s, /passive|active voice|change the voice|voice structure|active to passive|passive to active/)) {
    if (has(s, /\bquestion\b|interrogative/) || /\?/.test(clean(stem))) return out("eng-voice-interrogative", "voice");
    if (has(s, /imperative|\blet\b|please|do not|command|request|advice/)) return out("eng-voice-imperative", "voice");
    return out("eng-voice-assertive", "voice");
  }

  // 4. Error spotting / sentence correction
  if (has(s, /contains? (an )?error|part of the sentence.*error|spot the error|grammatical error|error in the sentence|find the (part|error)|identify the (segment|part)|incorrect(ly)? (part|segment|word)/)) {
    if (has(s, /subject[- ]verb|singular|plural|each of|every|neither|either|along with|as well as|one of|number of/)) return out("eng-sva-singular-plural", "spotting-error");
    if (has(s, /tense|since|has been|had been|yesterday|last (year|month|week|night)|ago|already/)) return out("eng-tense-perfect-past", "spotting-error");
    if (has(s, /preposition|phrasal/)) return out("eng-prep-fixed", "spotting-error");
    if (has(s, /pronoun|who|whom|whose|which of/)) return out("eng-pronoun-cases", "spotting-error");
    if (has(s, /article|determiner/)) return out("eng-articles-determiners", "spotting-error");
    return out("eng-modifiers-conjunctions", "spotting-error");
  }

  // 5. Sentence improvement / substitution
  if (has(s, /improve|replace the (highlighted|underlined)|most suitable option to replace|substitute the (highlighted|underlined)|sentence improvement/)) {
    if (has(s, /not only|either|neither|both|rather than|as well as|no sooner/)) return out("eng-modifiers-conjunctions", "spotting-error");
    if (has(s, /\b(has|have|had)\b.*\b(been|since|for)\b|tense/)) return out("eng-tense-perfect-past", "spotting-error");
    if (optHasPreposition) return out("eng-prep-fixed", "spotting-error");
    return out("eng-modifiers-conjunctions", "spotting-error");
  }

  // 6. One word substitution
  if (has(s, /one[- ]word|single word|one word substitute|one-word substitution|one word for/)) {
    if (has(s, /phobia|mania|obsession|fear of|love of|addiction/)) return out("eng-ows-phobias-manias", "one-word-substitution");
    if (has(s, /government|rule|cracy|system of|belief|worship|society|killing|murder|marriage/)) return out("eng-ows-gov-society", "one-word-substitution");
    return out("eng-ows-specialists", "one-word-substitution");
  }

  // 7. Idioms & proverbs
  if (has(s, /idiom|idiomatic|proverb|phrase|meaning of the (idiom|phrase)|figurative/)) {
    if (has(s, /homonym|homophone/)) return out("eng-vocab-synonym", "synonym");
    if (has(s, /proverb|saying|adage/)) return out("eng-proverb-expressions", "idiom");
    if (has(s, ANIMAL_COLOR)) return out("eng-idiom-nature-animals", "idiom");
    return out("eng-idiom-actions", "idiom");
  }

  // 8. Spelling
  if (has(s, /spell|misspelt|misspelled|correctly spelt|correct spelling|correctly spelled/))
    return out("eng-spell-double-consonant", "spelling");

  // 9. Synonym / antonym
  if (has(s, /synonym|similar (in )?meaning|same meaning|closest (in )?meaning|nearest (in )?meaning|most nearly/))
    return out("eng-vocab-synonym", "synonym");
  if (has(s, /antonym|opposite (in )?meaning|most opposite|contrary meaning/))
    return out("eng-vocab-antonym", "antonym");

  // 10. Cloze test (passage with numbered blanks)
  if (hasPassage && has(s, /blank|fill in|\(1\)|choose the (most )?appropriate word/))
    return out(optHasPreposition || optHasVerb || optHasDeterminer ? "eng-cloze-grammar" : "eng-cloze-vocabulary", "cloze-test");

  // 11. Reading comprehension
  if (hasPassage) {
    if (has(s, /central (idea|contrast|theme)|main idea|theme|tone|title|purpose|infer|implied|suggest|message|author (mean|argue|view|attitude)|why has|best (describes|summarises|summarizes)/))
      return out("eng-rc-inference-title", "reading-comprehension");
    return out("eng-rc-factual", "reading-comprehension");
  }

  // 12. Word usage, homonyms & context
  if (has(s, /homonym|homophone|uses? the word|in (a|the) .* context|contextually|correct(ly)? used|sentence containing/))
    return out("eng-vocab-synonym", "synonym");

  // 13. Standalone fill-in-the-blank: decide by what the options are
  if (has(s, /fill in the blank|fill in the blanks|_____|____|select the correct option|choose the correct option|complete the sentence/)) {
    if (optHasPreposition) return out("eng-prep-fixed", "cloze-test");
    if (optHasComparative) return out("eng-modifiers-conjunctions", "cloze-test");
    if (optHasDeterminer) return out("eng-articles-determiners", "cloze-test");
    if (optHasVerb) return out("eng-tense-perfect-past", "cloze-test");
    return out("eng-cloze-vocabulary", "cloze-test");
  }

  return out(hasPassage ? "eng-rc-factual" : ENG_MISC_ID, "standard", 0.4);
}
