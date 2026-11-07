// Weighted keyword classifier for General Awareness (GK).
// Replaces the old first-match if/else chain, which mis-tagged questions because
// it matched short substrings (e.g. "cag" inside "glucagon") anywhere in the
// question + options + explanation and kept whichever rule fired first.
//
// Design:
//  - Every pattern is anchored on word boundaries, so "cag" no longer matches "glucagon".
//  - Rules are scored rather than short-circuited: the micro-topic with the highest
//    weighted score wins, and the winner's margin becomes the confidence.
//  - The question stem counts double; the solution/explanation is supporting evidence.
//  - Anything that scores below MIN_SCORE goes to an explicit "Misc" bucket instead
//    of being silently filed under a wrong topic.

const MIN_SCORE = 8;
// Stems that carry no signal of their own ("Which of these is an odd one out?") are
// classified from the explanation, which needs one strong term rather than two.
const MIN_SECONDARY = 5;

function escapeTerm(term) {
  return term
    .trim()
    .split(/\s+/)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s-]+");
}

// Returns one word-boundary regex per term (also handles hyphenated / multi-word
// terms) so that every distinct term hit contributes to the score on its own.
function wb(...terms) {
  return terms.map(term => new RegExp(`(?:^|[^a-z0-9])(?:${escapeTerm(term)})(?![a-z0-9])`, "i"));
}

function norm(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#39;|&quot;|&amp;/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Order matters only for exact score ties (earlier = preferred).
const GA_RULES = [
  // ---------------------------------------------------------------- POLITY
  {
    id: "ga-pol-criminal-law",
    pats: [
      [wb("bnss", "bns", "bsa", "bharatiya nagarik suraksha sanhita", "bharatiya nyaya sanhita",
        "bharatiya sakshya adhiniyam", "crpc", "ipc", "indian penal code", "indian evidence act",
        "evidence act", "criminal procedure", "criminal law"), 6],
      [wb("zero fir", "default bail", "police custody", "chargesheet", "remand", "confession",
        "organized crime", "fir"), 3]
    ]
  },
  {
    id: "ga-pol-fr-writs",
    pats: [
      [wb("writ", "writs", "habeas corpus", "mandamus", "certiorari", "quo warranto",
        "constitutional remedies", "article 32", "article 226"), 6]
    ]
  },
  {
    id: "ga-pol-fr-equality",
    pats: [
      [wb("article 14", "article 15", "article 16", "article 17", "article 18", "right to equality",
        "equality before law", "reasonable classification", "untouchability"), 6]
    ]
  },
  {
    id: "ga-pol-fr-freedom",
    pats: [
      [wb("article 19", "article 20", "article 21", "article 22", "right to freedom",
        "freedom of speech", "protection of life", "personal liberty", "preventive detention",
        "right to property", "article 300a"), 6]
    ]
  },
  {
    id: "ga-pol-dpsp-duties",
    pats: [
      [wb("dpsp", "directive principles", "directive principle", "fundamental duties", "article 51a",
        "uniform civil code", "article 36", "article 37", "article 39", "article 40", "article 41",
        "article 43", "article 44", "article 45", "article 47", "article 48", "article 50"), 6]
    ]
  },
  {
    id: "ga-pol-amendments",
    pats: [
      [wb("amendment act", "constitutional amendment", "42nd amendment", "44th amendment",
        "86th amendment", "101st amendment", "mini-constitution", "seventh schedule",
        "ninth schedule", "schedule vii"), 6],
      [wb("schedule"), 3]
    ]
  },
  {
    id: "ga-pol-sources-preamble",
    pats: [
      [wb("preamble", "constituent assembly", "objective resolution", "government of india act",
        "regulating act", "charter act", "pitts india act", "minto", "morley", "montagu",
        "chelmsford", "sources of the constitution", "borrowed from", "federal court of india",
        "india council", "indian councils act"), 5]
    ]
  },
  {
    id: "ga-pol-president-gov",
    pats: [
      [wb("president", "presidential", "governor", "ordinance", "pardon", "electoral college",
        "impeachment", "article 52", "article 61", "article 72", "article 74", "article 123",
        "article 155", "article 161", "article 213", "vice president"), 4]
    ]
  },
  {
    id: "ga-pol-parliament-state",
    pats: [
      [wb("parliament", "lok sabha", "rajya sabha", "money bill", "financial bill", "speaker",
        "legislative assembly", "legislative council", "anti-defection", "council of ministers",
        "collective responsibility", "question hour", "zero hour"), 5],
      [wb("bill"), 2]
    ]
  },
  {
    id: "ga-pol-judiciary-bodies",
    pats: [
      [wb("supreme court", "high court", "cag", "comptroller and auditor general", "attorney general",
        "advocate general", "chief justice", "collegium", "judicial review", "election commission",
        "upsc", "finance commission", "national green tribunal", "tribunal", "jurisdiction",
        "article 124", "article 214", "article 324", "judiciary"), 5]
    ]
  },

  // --------------------------------------------------------------- HISTORY
  {
    id: "ga-hist-indus-vedic",
    pats: [
      [wb("indus valley", "harappan", "harappa", "mohenjodaro", "mohenjo-daro", "lothal", "dholavira",
        "chanhudaro", "kalibangan", "vedic", "veda", "vedas", "rigveda", "samaveda", "yajurveda",
        "atharvaveda", "mandala", "mandalas", "sukta", "suktas", "vedanga", "upanishad", "aranyaka",
        "brahmana", "pashupati"), 6]
    ]
  },
  {
    id: "ga-hist-buddhism-jainism",
    pats: [
      [wb("buddha", "buddhist", "buddhism", "jain", "jainism", "tirthankara", "mahavira", "bimbisara",
        "mahajanapada", "sangha", "buddhist council", "nikaya", "triratna", "anekantavada", "bhakti",
        "saguna", "nirguna", "dhamma"), 6]
    ]
  },
  {
    id: "ga-hist-mauryas-guptas",
    pats: [
      [wb("maurya", "mauryan", "chandragupta", "bindusara", "ashoka", "kautilya", "arthashastra",
        "megasthenes", "gupta", "guptas", "samudragupta", "harshavardhana", "prayaga prashasti",
        "allahabad pillar", "bhaga", "hiranya", "kushana", "kushan", "devaputra", "prashasti",
        "inscription"), 5]
    ]
  },
  {
    id: "ga-hist-south-dynasties",
    pats: [
      [wb("chola", "cholas", "pallava", "pallavas", "rashtrakuta", "chalukya", "chalukyas", "pandya",
        "aihole", "badami", "brihadeeswara", "kanchipuram", "sangam"), 6]
    ]
  },
  {
    id: "ga-hist-delhi-sultanate",
    pats: [
      [wb("delhi sultanate", "slave dynasty", "mamluk", "khilji", "tughlaq", "sayyid", "lodi",
        "qutub-ud-din aibak", "qutb-ud-din", "alauddin", "firoz shah", "timur", "sher shah",
        "sur dynasty", "market reforms", "iqta"), 6]
    ]
  },
  {
    id: "ga-hist-mughals",
    pats: [
      [wb("mughal", "mughals", "babur", "humayun", "akbar", "jahangir", "shah jahan", "aurangzeb",
        "mansabdari", "jagir", "sulh-i-kul", "din-i-ilahi", "first battle of panipat",
        "second battle of panipat", "taj mahal", "red fort", "provincial capital"), 6]
    ]
  },
  {
    id: "ga-hist-vijayanagar-marathas",
    pats: [
      [wb("vijayanagara", "vijayanagar", "krishnadeva raya", "maratha", "marathas", "shivaji", "peshwa",
        "ashta pradhan", "chauth", "saranjam", "third battle of panipat"), 6]
    ]
  },
  {
    id: "ga-hist-1857-viceroys",
    pats: [
      [wb("1857", "revolt of 1857", "sepoy mutiny", "viceroy", "governor-general", "ilbert bill",
        "curzon", "dalhousie", "canning", "lytton", "ripon", "partition of bengal",
        "doctrine of lapse", "subsidiary alliance", "vernacular press act", "rowlatt act"), 5]
    ]
  },
  {
    id: "ga-hist-congress-gandhi",
    pats: [
      [wb("indian national congress", "inc session", "gandhi", "gandhian", "non-cooperation",
        "civil disobedience", "quit india", "salt satyagraha", "dandi", "champaran", "kheda",
        "poorna swaraj", "nehru report", "khilafat", "swadeshi movement", "cabinet mission",
        "cripps mission"), 5]
    ]
  },
  {
    id: "ga-hist-freedom-movements",
    pats: [
      [wb("revolutionary", "martyr", "chapekar", "kanaklata", "baji raut", "kol revolt", "tribal revolt",
        "santhal", "birsa munda", "brahmo samaj", "arya samaj", "prarthana samaj",
        "ramakrishna mission", "vivekananda", "aligarh movement", "satyashodhak",
        "self-respect movement", "young bengal", "age of consent act", "press act",
        "socio-religious reform"), 5]
    ]
  },

  // ----------------------------------------------------------- ART & CULTURE
  {
    id: "ga-art-classical-folk-dance",
    pats: [
      [wb("dance", "dances", "nritya", "kathak", "bharatanatyam", "kathakali", "kuchipudi", "odissi",
        "manipuri dance", "mohiniyattam", "sattriya", "chhau", "cheraw", "kalbelia", "garba",
        "bihu dance", "yakshagana", "lavani", "thang-ta"), 6]
    ]
  },
  {
    id: "ga-art-music-gharanas",
    pats: [
      [wb("music", "musical", "raga", "ragas", "taal", "tala", "matra", "gharana", "gharanas", "sitar",
        "sarod", "tabla", "shehnai", "flute", "veena", "santoor", "mridangam", "hindustani classical",
        "carnatic", "sangita", "vadya", "bandish", "kriti", "dhrupad", "khayal", "annamacharya",
        "musical instrument"), 5]
    ]
  },
  {
    id: "ga-art-festivals-fairs",
    pats: [
      [wb("festival", "festivals", "mela", "fair", "fairs", "celebrated", "celebration", "pongal",
        "onam", "bihu", "hornbill festival", "hola mohalla", "chithirai", "nyokum", "pongtu", "goncha",
        "jawa festival", "kambala", "parab", "sammakka"), 6]
    ]
  },
  {
    id: "ga-art-temple-architecture",
    pats: [
      [wb("temple", "temples", "architecture", "nagara", "dravida", "phamsana", "latina", "cave",
        "caves", "ajanta", "ellora", "elephanta", "stupa", "ashokan pillar", "sculpture", "gandhara",
        "mathura art", "unesco world heritage", "fort", "gwalior fort", "rock-cut", "monolith",
        "mandapa", "shikhara", "gopuram"), 5]
    ]
  },

  // ------------------------------------------------------------- GEOGRAPHY
  {
    id: "ga-geo-earth-solar",
    pats: [
      [wb("solar system", "planet", "planets", "latitude", "longitude", "equator", "tropic of cancer",
        "tropic of capricorn", "rotation of the earth", "revolution of the earth", "eclipse", "moon",
        "asteroid", "meteor", "milky way", "galaxy", "aurora", "light pollution", "deep-sky",
        "earth crust", "earth mantle", "earth core"), 6]
    ]
  },
  {
    id: "ga-geo-atmosphere-climate",
    pats: [
      [wb("atmosphere", "atmospheric", "stratosphere", "troposphere", "ozone", "cyclone", "anticyclone",
        "wind", "winds", "ocean current", "ocean currents", "el nino", "la nina",
        "convectional rainfall", "weather", "humidity", "jet stream", "greenhouse gas", "global warming",
        "climate change", "glacier", "glacial", "landslide", "hanging valley", "moraine"), 4]
    ]
  },
  {
    id: "ga-geo-rivers-dams",
    pats: [
      [wb("river", "rivers", "tributary", "tributaries", "dam", "dams", "basin", "delta", "estuary",
        "confluence", "waterfall", "canal", "irrigation", "lake", "water-sharing", "ganga", "brahmaputra",
        "godavari", "krishna river", "cauvery", "narmada", "tapi", "indus water treaty",
        "river system"), 6]
    ]
  },
  {
    id: "ga-geo-mountains-passes",
    pats: [
      [wb("mountain", "mountains", "himalaya", "himalayas", "aravalli", "western ghats", "eastern ghats",
        "peak", "pass", "plateau", "mountain range", "everest", "kanchenjunga", "k2", "hill station"), 5]
    ]
  },
  {
    id: "ga-geo-monsoon-soils",
    pats: [
      [wb("monsoon", "soil", "soils", "climate zone", "kharif", "rabi", "zaid", "soil erosion",
        "desertification", "drought", "alluvial", "black soil", "red soil", "laterite", "salinization",
        "cropping season"), 6]
    ]
  },
  {
    id: "ga-geo-national-parks",
    pats: [
      [wb("national park", "national parks", "wildlife sanctuary", "biosphere reserve", "ramsar",
        "tiger reserve", "project tiger", "elephant reserve", "conservation reserve", "wetland",
        "wetlands", "eco-tourism"), 6]
    ]
  },
  {
    id: "ga-geo-minerals-crops",
    pats: [
      [wb("mineral", "minerals", "ore", "ores", "coal", "bauxite", "mica", "iron ore", "manganese",
        "copper", "crop", "crops", "cropping", "agriculture", "wheat", "rice", "sugarcane", "cotton",
        "plantation", "horticulture", "mineral belt", "mineral wealth", "iron and steel industry"), 4]
    ]
  },
  {
    id: "ga-geo-census-2011",
    pats: [
      [wb("census 2011", "census of india", "census", "population density", "sex ratio", "literacy rate",
        "decadal", "demographic", "population growth", "urban population", "population pyramid",
        "juvenile population", "population stabilization", "rate of natural increase", "demography"), 6]
    ]
  },

  // --------------------------------------------------------------- ECONOMY
  {
    id: "ga-eco-national-income",
    pats: [
      [wb("gdp", "gnp", "nnp", "national income", "real income", "nominal income", "per capita income",
        "revenue deficit", "fiscal deficit", "disinvestment", "privatization", "economic growth",
        "gross domestic product", "gross national product"), 6]
    ]
  },
  {
    id: "ga-eco-inflation-money",
    pats: [
      [wb("inflation", "cpi", "wpi", "consumer price index", "wholesale price index", "money supply",
        "deflation", "purchasing power", "price index", "elasticity of demand", "demand curve",
        "indifference curve", "market structure", "monopoly", "oligopoly", "fiscal policy"), 4]
    ]
  },
  {
    id: "ga-eco-rbi-monetary",
    pats: [
      [wb("rbi", "reserve bank of india", "repo rate", "reverse repo", "crr", "slr", "bank rate",
        "monetary policy", "open market operations", "banking", "npa", "non-performing asset",
        "foreign exchange", "forex", "convertibility", "financial inclusion", "sebi"), 6]
    ]
  },
  {
    id: "ga-eco-budget-taxation",
    pats: [
      [wb("union budget", "budget", "tax", "taxes", "taxation", "gst", "goods and services tax",
        "direct tax", "indirect tax", "subsidy", "subsidies", "public debt", "revenue budget",
        "capital budget", "finance bill", "appropriation bill", "fiscal responsibility"), 5]
    ]
  },
  {
    id: "ga-eco-five-year-plans",
    pats: [
      [wb("five year plan", "five-year plan", "first five year plan", "twelfth five year plan",
        "niti aayog", "planning commission", "plan holiday", "rolling plan", "indian planning",
        "national development council"), 6]
    ]
  },
  {
    id: "ga-eco-gov-schemes",
    pats: [
      [wb("yojana", "abhiyan", "pradhan mantri", "pm kisan", "pm-kmy", "awas yojana", "ujjwala",
        "jan dhan", "mudra", "sukanya samriddhi", "ayushman bharat", "esanjeevani", "digital india",
        "skill india", "startup india", "smart cities", "swachh bharat", "atal mission",
        "national population policy", "mission karmayogi", "dak karmayogi"), 5],
      [wb("scheme", "schemes"), 3]
    ]
  },

  // ------------------------------------------------------- GENERAL SCIENCE
  {
    id: "ga-sci-units-dimensions",
    pats: [
      [wb("si unit", "si units", "unit of", "dimensions", "dimensional formula", "measured in",
        "barometer", "thermometer", "hydrometer", "speedometer", "ammeter", "voltmeter",
        "galvanometer", "kilowatt hour"), 5],
      [wb("unit", "units"), 2]
    ]
  },
  {
    id: "ga-sci-motion-gravity",
    pats: [
      [wb("newton", "newtonian", "gravitation", "gravity", "force", "motion", "velocity", "acceleration",
        "momentum", "inertia", "friction", "kinetic energy", "potential energy", "work done",
        "projectile", "angular velocity", "orbital velocity", "centripetal", "escape velocity",
        "weightlessness", "free fall", "law of motion", "conservation of energy"), 5]
    ]
  },
  {
    id: "ga-sci-optics-sound",
    pats: [
      [wb("optics", "lens", "lenses", "mirror", "mirrors", "refraction", "reflection", "dispersion",
        "rainbow", "prism", "focal length", "magnification", "sound", "echo", "doppler", "frequency",
        "wavelength", "ultrasonic", "decibel", "least distance of distinct vision", "human eye",
        "myopia", "hypermetropia", "speed of light", "visible light"), 5]
    ]
  },
  {
    id: "ga-sci-heat-electricity",
    pats: [
      [wb("heat", "temperature", "thermodynamics", "conduction", "convection", "radiation",
        "specific heat", "latent heat", "electric current", "electricity", "resistance", "ohm",
        "voltage", "circuit", "magnet", "magnetic", "electromagnet", "induction", "transformer",
        "electric motor", "generator", "fuse", "semiconductor", "diode", "photoelectric",
        "nuclear fission", "nuclear fusion", "radioactivity", "radioactive", "beta decay", "gamma decay",
        "alpha decay", "atomic number"), 4]
    ]
  },
  {
    id: "ga-sci-periodic-table",
    pats: [
      [wb("periodic table", "atomic mass", "atomic radius", "mendeleev", "valency", "isotope",
        "isobars", "electron configuration", "electronic configuration", "noble gas",
        "alkali metal"), 6]
    ]
  },
  {
    id: "ga-sci-acids-bases-salts",
    pats: [
      [wb("acid", "acids", "base", "bases", "alkali", "ph", "indicator", "litmus", "neutralisation",
        "neutralization", "hydrochloric", "sulphuric acid", "nitric acid", "bleaching powder",
        "baking soda", "washing soda", "plaster of paris"), 5]
    ]
  },
  {
    id: "ga-sci-metals-carbon",
    pats: [
      [wb("metal", "metals", "non-metal", "non-metals", "alloy", "alloys", "steel", "bronze", "brass",
        "amalgam", "galvanisation", "galvanization", "rusting", "corrosion", "carbon", "graphite",
        "diamond", "fullerene", "hydrocarbon", "alkane", "alkene", "benzene", "coke"), 4]
    ]
  },
  {
    id: "ga-sci-everyday-chemistry",
    pats: [
      [wb("polymer", "polymers", "plastic", "plastics", "fertiliser", "fertilizer", "pesticide",
        "detergent", "soap", "cement", "glass", "paint", "dye", "preservative", "chemical formula",
        "helium", "argon", "neon", "noble gases", "hydrogen peroxide", "water treatment", "antacid"), 4]
    ]
  },
  {
    id: "ga-sci-cell-genetics",
    pats: [
      [wb("cell", "cells", "organelle", "organelles", "mitochondria", "mitochondrion", "ribosome",
        "golgi", "lysosome", "nucleus", "dna", "rna", "gene", "genes", "genetic", "chromosome",
        "telomere", "telomerase", "amino acid", "protein synthesis", "transcription", "translation",
        "mitosis", "meiosis", "prokaryote", "prokaryotic", "eukaryote", "eukaryotic", "cytoskeleton",
        "biomolecule", "biomolecules", "atp", "nadh", "glucose", "enzyme", "enzymes",
        "plasma membrane", "phospholipid", "pleiotropy", "cellular respiration", "glycolysis",
        "krebs cycle", "electron transport chain", "nucleic acid"), 5]
    ]
  },
  {
    id: "ga-sci-human-physiology",
    pats: [
      [wb("blood", "heart", "circulatory", "circulation", "digestive", "digestion", "nervous system",
        "brain", "neuron", "endocrine", "hormone", "hormones", "insulin", "thyroid", "kidney", "nephron",
        "respiratory", "lungs", "alveoli", "bone", "bones", "muscle", "skeleton", "skin", "stomach",
        "liver", "pancreas", "reflex action", "spinal cord", "small intestine", "large intestine"), 5]
    ]
  },
  {
    id: "ga-sci-diseases-immunity",
    pats: [
      [wb("disease", "diseases", "pathogen", "pathogens", "bacteria", "bacterial", "virus", "viral",
        "fungus", "protozoa", "malaria", "tuberculosis", "immunity", "immune", "antibody", "antibodies",
        "vaccine", "vaccination", "antigen", "aids", "hiv", "cancer", "deficiency disease",
        "vector-borne", "infection", "antibiotic", "immunisation", "immunization"), 5]
    ]
  },
  {
    id: "ga-sci-vitamins-nutrition",
    pats: [
      [wb("vitamin", "vitamins", "deficiency", "scurvy", "rickets", "beriberi", "pellagra",
        "night blindness", "nutrition", "nutritional", "diet", "calorie", "malnutrition",
        "balanced diet"), 5]
    ]
  },
  {
    id: "ga-sci-plant-kingdom",
    pats: [
      [wb("plant", "plants", "photosynthesis", "chlorophyll", "stomata", "xylem", "phloem",
        "pollination", "germination", "plant hormone", "auxin", "cytokinin", "gibberellin", "ethylene",
        "algae", "bryophyte", "pteridophyte", "gymnosperm", "angiosperm", "chloroplast",
        "transpiration"), 4]
    ]
  },

  // ------------------------------------------------- STATIC GK & CURRENT AFFAIRS
  {
    id: "ga-gk-sports-stadiums",
    pats: [
      [wb("stadium", "stadiums", "trophy", "trophies", "terminology", "foul", "offside", "service box",
        "referee", "umpire", "wicket", "innings", "dribble", "goalkeeper", "court dimensions",
        "equipment", "judo", "basketball", "badminton", "hockey", "football", "cricket", "high jump",
        "long jump", "swimming", "wrestling", "boxing", "table tennis", "kho kho", "kabaddi",
        "water polo", "archery", "weightlifting", "athletics", "sculling", "grand slam", "chess"), 4]
    ]
  },
  {
    id: "ga-ca-sports-awards",
    pats: [
      [wb("olympic", "olympics", "paralympic", "asian games", "commonwealth games", "championship",
        "championships", "tournament", "world cup", "gold medal", "silver medal", "bronze medal",
        "medal", "winner", "neeraj chopra", "milkha singh", "dhyan chand", "khelo india",
        "national games", "diamond league", "athlete", "athletes"), 5]
    ]
  },
  {
    id: "ga-ca-national-awards",
    pats: [
      [wb("bharat ratna", "padma", "padma shri", "padma vibhushan", "khel ratna", "arjuna award",
        "dronacharya award", "dhyan chand award", "national award", "filmfare", "oscar", "nobel prize",
        "gallantry award", "param vir chakra", "ashoka chakra", "sahitya akademi award"), 6]
    ]
  },
  {
    id: "ga-ca-reports-indices",
    pats: [
      [wb("index", "indices", "ranking", "rankings", "global peace index", "human development index",
        "ease of doing business", "competitiveness", "gender gap", "happiness index", "press freedom",
        "logistics performance", "energy transition index",
        "travel and tourism development index", "global firepower", "global cities index",
        "world competitiveness"), 4],
      [wb("report", "reports"), 3]
    ]
  },
  {
    id: "ga-ca-summits-appointments",
    pats: [
      [wb("summit", "summits", "g20", "g7", "brics", "sco", "appointed", "appointment", "assumed charge",
        "took oath", "ceo of", "chairperson of", "conference of parties", "cop30", "state visit",
        "bilateral"), 5]
    ]
  },
  {
    id: "ga-ca-space-defence",
    pats: [
      [wb("isro", "nasa", "satellite", "satellites", "spacecraft", "rocket", "launch vehicle", "gslv",
        "pslv", "sslv", "lvm3", "hlvm3", "gaganyaan", "chandrayaan", "mangalyaan", "aditya-l1", "nisar",
        "xposat", "payload", "space station", "bharatiya antariskh", "space mission", "orbit regime",
        "geostationary", "sun-synchronous", "drdo", "missile", "brahmos", "agni", "defence", "defense",
        "fighter jet", "tejas", "ins vikrant", "navy", "military exercise", "mitra shakti",
        "tiger triumph", "varuna", "air force"), 5]
    ]
  },
  {
    id: "ga-gk-books-authors",
    pats: [
      [wb("book", "books", "author", "authors", "written by", "autobiography", "novel", "memoir",
        "booker prize", "jnanpith", "sahitya akademi", "pulitzer", "literary"), 5]
    ]
  },
  {
    id: "ga-gk-org-headquarters",
    pats: [
      [wb("headquarters", "headquarter", "headquartered", "organisation", "organization",
        "united nations", "unesco", "world health organization", "imf", "international monetary fund",
        "world bank", "wto", "saarc", "asean", "opec", "nato", "secretary-general", "founded in",
        "member countries", "new development bank"), 4]
    ]
  },
  {
    id: "ga-gk-firsts-records",
    pats: [
      [wb("first in india", "first indian", "first woman", "first-ever", "first to", "record", "largest",
        "longest", "highest", "smallest", "oldest", "superlative"), 3]
    ]
  }
];

// Supplementary vocabulary for terms that showed up in the audit but were missing
// from the base rules above (sports rules, economy concepts, centre-state polity,
// British-era administrative acts, welfare schemes, physical geography).
const EXTRA_TERMS = {
  "ga-gk-sports-stadiums": [
    [5, ["handball", "taekwondo", "taekwon-do", "pole vault", "kabaddi", "chess", "en passant",
      "zugzwang", "pawn promotion", "tiebreak", "swish", "slam dunk", "goal post", "yellow card",
      "red card", "deuce", "volleyball", "golf", "squash", "billiards", "fencing", "gymnastics",
      "javelin", "discus throw", "hammer throw", "shot put", "marathon", "relay race", "durand cup",
      "intercontinental cup", "santosh trophy", "ranji trophy", "davis cup", "teer"]],
    [3, ["penalty", "batting", "bowling", "sprint", "hurdles", "shuttle", "racket", "puck", "lap",
      "golden raid", "service rules"]]
  ],
  "ga-ca-sports-awards": [
    [4, ["saf games", "south asian federation games", "commonwealth", "world championship",
      "olympiad", "qualifier", "final match", "semi-final", "medal tally", "podium"]]
  ],
  "ga-eco-national-income": [
    [4, ["production possibility frontier", "ppf", "opportunity cost", "mixed economy", "market economy",
      "planned economy", "joint sector", "cooperative sector", "public sector", "private sector",
      "navratna", "maharatna", "miniratna", "import substitution", "licensing policy", "liberalisation",
      "globalization", "mnc", "multinational", "land reforms", "economic reforms", "scarcity definition",
      "adam smith", "alfred marshall", "samuelson", "primary sector", "secondary sector", "tertiary sector",
      "rural-urban", "output market", "factor market", "light industry", "heavy industry",
      "industrial sector", "sugar industry", "fertilizer industry", "textile industry",
      "sector industries"]]
  ],
  "ga-eco-inflation-money": [
    [4, ["snob effect", "demonstration effect", "bandwagon effect", "veblen effect", "income elasticity",
      "price elasticity", "supply curve", "demand and supply", "market equilibrium", "marginal utility",
      "consumer behaviour", "inflation rate"]]
  ],
  "ga-pol-sources-preamble": [
    [4, ["pitts india act", "pitt's india act", "board of control", "court of directors", "federalism",
      "centre-state", "centre state", "concurrent list", "union list", "state list", "zonal council",
      "inter-state council", "sarkaria commission", "punchhi commission", "rajamannar committee",
      "grants-in-aid", "article 1", "article 3", "article 239", "article 240", "article 263",
      "article 268", "article 275", "article 300", "article 310", "delegated legislation",
      "sixth schedule", "all-india service", "all india service", "consolidated fund",
      "contingency fund", "public service commission", "official language", "article 343",
      "article 348", "rajya sabha", "eighth schedule", "concurrent list"]]
  ],
  "ga-hist-1857-viceroys": [
    [5, ["cornwallis", "permanent settlement", "factory act", "macaulay", "wood's despatch",
      "hunter commission", "first railway line", "railways in india", "board of revenue"]]
  ],
  "ga-hist-indus-vedic": [
    [4, ["mesolithic", "palaeolithic", "paleolithic", "neolithic", "stone age", "charaka", "sushruta",
      "vagbhata", "ashtanga sangraha", "ayurveda"]]
  ],
  "ga-hist-delhi-sultanate": [
    [4, ["marco polo", "ibn battuta", "fa hien", "hiuen tsang", "traveller", "pepper trade"]]
  ],
  "ga-hist-freedom-movements": [
    [5, ["raja rammohan roy", "sati", "rani gaidinliu", "khongjom war", "thakkar bapa", "social worker",
      "tribal uprising", "heraka"]]
  ],
  "ga-art-classical-folk-dance": [
    [5, ["tippani", "thoda", "folk dance", "martial dance", "tribal dance", "perini", "jhora",
      "shivatandavam"]]
  ],
  "ga-art-festivals-fairs": [
    [4, ["procession", "jhanki", "rath yatra", "sawari", "chhabina", "dharnath"]]
  ],
  "ga-geo-earth-solar": [
    [4, ["black hole", "pulsar", "neutron star", "supernova", "telescope", "james webb", "jwst",
      "light year", "comet"]]
  ],
  "ga-geo-atmosphere-climate": [
    [4, ["volcano", "volcanic", "earthquake", "rockslide", "rockfall", "slump", "debris fall",
      "glacial till", "tsunami", "tide", "climatic zone", "climatic zones", "tropical zone",
      "temperate zone", "polar zone", "carbon sink", "emissions", "net zero", "convectional rainfall",
      "rainfall", "solar wind", "amoc"]]
  ],
  "ga-geo-rivers-dams": [
    [3, ["ocean", "island", "island nation", "coral reef", "suez canal", "panama canal", "strait",
      "trade route", "sea route"]]
  ],
  "ga-sci-heat-electricity": [
    [4, ["nichrome", "heating element", "bohr model", "energy level", "hydrogen atom", "filament",
      "resistivity"]]
  ],
  "ga-sci-units-dimensions": [
    [4, ["electric lamp", "kilowatt-hour", "kilowatt hour", "energy consumed", "commercial unit"]]
  ],
  "ga-ca-reports-indices": [
    [5, ["corruption perception", "perceptions index", "swachh vayu sarvekshan", "sarvekshan",
      "transparency international", "world economic forum", "development programme"]]
  ],
  "ga-eco-gov-schemes": [
    [5, ["udan", "svamitva", "green credit programme", "amrit sarovar", "green hydrogen", "lithium-ion",
      "umbrella scheme", "national framework for climate services", "nfcs", "mission mangrove",
      "sagar suraksha", "ecojobs", "one nation one", "rashtriya", "national mission", "flagship",
      "mishti", "ek ped maa ke naam", "nafcc", "adaptation fund"]]
  ],
  "ga-ca-summits-appointments": [
    [5, ["bimstec", "quad", "chabahar", "trilateral highway", "kaladan", "national security advisor",
      "ajit doval", "indo-pacific", "economic cooperation and trade agreement", "ecta"]]
  ],
  "ga-gk-org-headquarters": [
    [4, ["international big cat alliance", "big cat alliance", "member state leads", "priority area"]]
  ],
  "ga-gk-firsts-records": [
    [4, ["land of the", "detroit of india", "sobriquet", "popularly known as", "known as the"]]
  ],
  // Corrections found while auditing every GK tag against its question stem.
  // NOTE: never re-declare an id already present above — duplicate object keys
  // silently drop the earlier group. Extend the existing entry instead.
  "ga-hist-mauryas-guptas": [
    [5, ["sarthavaha", "shreni", "guild", "gupta administration", "mauryan administration"]]
  ],
  "ga-pol-judiciary-bodies": [
    [5, ["exclusive original jurisdiction", "article 131", "solicitor general", "judicial review power"]]
  ],
  "ga-art-temple-architecture": [
    [5, ["konark", "sun temple", "bharhut", "sanchi stupa", "rock-cut architecture"]]
  ],
  "ga-geo-national-parks": [
    [6, ["mangrove", "mangroves", "mangrove cell"]]
  ],
  "ga-pol-amendments": [
    [6, ["article 246a", "article 269a", "gst council"]]
  ]
};

for (const [id, groups] of Object.entries(EXTRA_TERMS)) {
  const rule = GA_RULES.find(r => r.id === id);
  if (!rule) throw new Error(`Unknown micro-topic in EXTRA_TERMS: ${id}`);
  for (const [weight, terms] of groups) rule.pats.push([wb(...terms), weight]);
}

export const GA_MISC_ID = "ga-gk-misc";

function rank(primary, secondary) {
  const scored = [];
  for (let i = 0; i < GA_RULES.length; i++) {
    const rule = GA_RULES[i];
    let score = 0;
    for (const [regexes, weight] of rule.pats) {
      for (const re of regexes) {
        if (re.test(primary)) score += weight * 2;
        else if (secondary && re.test(secondary)) score += weight;
      }
    }
    if (score > 0) scored.push({ id: rule.id, score, order: i });
  }
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored;
}

function decide(scored, min = MIN_SCORE) {
  const best = scored[0];
  if (!best || best.score < min) {
    return { microTopicId: GA_MISC_ID, confidence: 0.3, score: best ? best.score : 0 };
  }
  const runnerUp = scored[1];
  const ratio = runnerUp ? (best.score - runnerUp.score) / best.score : 1;
  const confidence = ratio >= 0.5 ? 0.92 : ratio >= 0.25 ? 0.82 : 0.7;
  return { microTopicId: best.id, confidence, score: best.score };
}

export function classifyGA({ stem = "", solution = "", explanation = "" } = {}) {
  const primary = norm(stem);
  const secondary = norm(`${solution} ${explanation}`);

  // The question stem decides whenever it carries a usable signal. Explanations
  // routinely name other topics (a President/Governor question whose solution
  // discusses the Supreme Court), so they are only consulted for stems that say
  // nothing on their own ("Which of these is an odd one out?").
  const fromStem = rank(primary, null);
  if (fromStem.length && fromStem[0].score >= MIN_SCORE) return decide(fromStem);

  return decide(rank(primary, secondary), MIN_SECONDARY);
}
