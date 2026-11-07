import fs from "node:fs/promises";
import path from "node:path";

const TAXONOMY = {
  version: "2.0.0",
  updatedAt: new Date().toISOString(),
  description: "SSC CGL 4-Tier Master Syllabus Taxonomy with Lowest Micro-Topic Granularity",
  subjects: [
    {
      id: "reasoning",
      name: "General Intelligence & Reasoning",
      short: "Reasoning",
      icon: "🧠",
      qRange: [1, 25],
      chapters: [
        {
          id: "analogy-classification",
          name: "Analogy & Classification",
          topics: [
            {
              id: "number-analogy",
              name: "Number Analogy",
              microTopics: [
                { id: "num-square-cube", name: "Square / Cube ± n Logic" },
                { id: "num-digit-op", name: "Operations on Digits (Sum / Product)" },
                { id: "num-triplet-set", name: "Set-Based Number Triplets (a, b, c)" },
                { id: "num-ratio-factor", name: "Ratio / Multiplicative Factor" }
              ]
            },
            {
              id: "letter-analogy",
              name: "Letter Analogy",
              microTopics: [
                { id: "let-position-shift", name: "Positional Forward / Reverse Shift" },
                { id: "let-opposite-pairs", name: "Opposite Letter Pairs (A-Z, B-Y)" },
                { id: "let-vowel-consonant", name: "Vowel / Consonant Logic" }
              ]
            },
            {
              id: "word-analogy",
              name: "Word / GK Analogy",
              microTopics: [
                { id: "word-unit-measure", name: "Physical Quantities & SI Units" },
                { id: "word-geo-capital", name: "Country, Capital, Currency & Rivers" },
                { id: "word-instrument-measure", name: "Scientific Instruments & Measurements" },
                { id: "word-worker-tool", name: "Worker & Tool / Profession" },
                { id: "word-synonym-antonym", name: "Semantic Synonym / Antonym Analogy" }
              ]
            },
            {
              id: "classification-odd-one",
              name: "Odd One Out (Classification)",
              microTopics: [
                { id: "odd-number", name: "Number Classification (Prime, Square, Divisibility)" },
                { id: "odd-letter", name: "Letter Cluster Odd One Out" },
                { id: "odd-word", name: "Semantic Word Classification" }
              ]
            }
          ]
        },
        {
          id: "series-completion",
          name: "Series Completion",
          topics: [
            {
              id: "number-series",
              name: "Number Series",
              microTopics: [
                { id: "num-ser-diff", name: "Constant / Increasing Step Difference" },
                { id: "num-ser-double-diff", name: "Double Difference Series" },
                { id: "num-ser-mult-alt", name: "Multiplicative & Alternating Series" },
                { id: "num-ser-square-cube", name: "Square, Cube & Prime Series" }
              ]
            },
            {
              id: "letter-series",
              name: "Letter & Cluster Series",
              microTopics: [
                { id: "let-ser-single", name: "Single Letter Progression" },
                { id: "let-ser-cluster", name: "Multi-Letter Cluster Series" },
                { id: "let-ser-continuous", name: "Continuous Repeating Letter Pattern (a_b_a)" }
              ]
            }
          ]
        },
        {
          id: "coding-decoding",
          name: "Coding-Decoding",
          topics: [
            {
              id: "letter-coding",
              name: "Letter Coding",
              microTopics: [
                { id: "code-direct-shift", name: "Direct Forward / Backward Shift" },
                { id: "code-cross-diagonal", name: "Cross / Diagonal Letter Exchange" },
                { id: "code-opposite-letter", name: "Opposite Letter Coding" }
              ]
            },
            {
              id: "number-symbol-coding",
              name: "Number & Symbol Coding",
              microTopics: [
                { id: "code-pos-sum", name: "Letter Position Sum & Calculation" },
                { id: "code-symbol-map", name: "Symbol & Special Character Mapping" }
              ]
            },
            {
              id: "substitution-coding",
              name: "Substitution / Chinese Coding",
              microTopics: [
                { id: "code-chinese-decipher", name: "Deciphering Common Words in Coded Phrases" }
              ]
            }
          ]
        },
        {
          id: "deductive-analytical",
          name: "Deductive & Analytical Reasoning",
          topics: [
            {
              id: "syllogism",
              name: "Syllogism",
              microTopics: [
                { id: "syl-standard-23", name: "Standard 2 or 3 Statements (All, Some, No)" },
                { id: "syl-only-few", name: "'Only a Few' / 'Few' Modern Patterns" },
                { id: "syl-possibility", name: "Possibility Cases & Either-Or Conditions" }
              ]
            },
            {
              id: "blood-relations",
              name: "Blood Relations",
              microTopics: [
                { id: "blood-family-tree", name: "Direct Statement & Family Tree" },
                { id: "blood-coded", name: "Coded Relations (A + B means Father)" },
                { id: "blood-pointing", name: "Pointing to Person / Photograph" }
              ]
            },
            {
              id: "direction-distance",
              name: "Direction & Distance",
              microTopics: [
                { id: "dir-turns-displacement", name: "Cardinal Turns & Pythagoras Shortest Distance" },
                { id: "dir-shadow-angle", name: "Shadow & Angular Rotations" }
              ]
            },
            {
              id: "order-ranking-seating",
              name: "Order, Ranking & Seating",
              microTopics: [
                { id: "rank-linear-order", name: "Position Left/Right & Total Persons (L+R-1)" },
                { id: "seating-linear-row", name: "Linear Row Arrangement (North/South)" },
                { id: "seating-circular", name: "Circular Table Arrangement" }
              ]
            }
          ]
        },
        {
          id: "non-verbal-reasoning",
          name: "Non-Verbal Reasoning",
          topics: [
            {
              id: "mirror-water-images",
              name: "Mirror & Water Images",
              microTopics: [
                { id: "nv-mirror-text", name: "Alphanumeric & Letter Mirror Images" },
                { id: "nv-mirror-figure", name: "Geometric Shapes & Clock Reflections" }
              ]
            },
            {
              id: "paper-folding-cutting",
              name: "Paper Folding & Cutting",
              microTopics: [
                { id: "nv-paper-fold-cut", name: "Step-by-Step Unfolding & Punch Symmetry" }
              ]
            },
            {
              id: "figure-completion-embedded",
              name: "Embedded Figures & Pattern Completion",
              microTopics: [
                { id: "nv-embedded-figure", name: "Hidden / Embedded Shape Detection" },
                { id: "nv-pattern-complete", name: "Matrix / Incomplete Pattern Fill" }
              ]
            },
            {
              id: "figure-series-rotation",
              name: "Figure Series & Rotation",
              microTopics: [
                { id: "nv-fig-series-rot", name: "Step-wise Element Rotation & Movement" }
              ]
            },
            {
              id: "cubes-dice",
              name: "Cubes & Dice",
              microTopics: [
                { id: "nv-dice-opposite-standard", name: "Opposite Face in Closed Dice Views" },
                { id: "nv-dice-open-sheet", name: "Open Sheet Unfolded Dice" }
              ]
            }
          ]
        },
        {
          id: "mathematical-operations-logic",
          name: "Mathematical Operations & Logic",
          topics: [
            {
              id: "math-operators",
              name: "Mathematical Operations",
              microTopics: [
                { id: "math-sign-interchange", name: "Interchanging Signs (+ and ×)" },
                { id: "math-num-interchange", name: "Interchanging Numbers to Balance Equation" },
                { id: "math-bodmas-equation", name: "Direct Operator Substitution & BODMAS" }
              ]
            },
            {
              id: "venn-diagrams",
              name: "Venn Diagrams",
              microTopics: [
                { id: "venn-geometric-overlap", name: "3-Circle Geometric Overlap (DI / Count)" },
                { id: "venn-logical-classes", name: "Word Category Classification Venn" }
              ]
            },
            {
              id: "critical-reasoning",
              name: "Critical Reasoning",
              microTopics: [
                { id: "crit-statement-conclusion", name: "Statement & Conclusions" },
                { id: "crit-statement-assumption", name: "Statement & Assumptions" }
              ]
            },
            {
              id: "matching-word-formation",
              name: "Matching & Word Formation",
              microTopics: [
                { id: "rea-matching", name: "Address, Symbol & Similarity Matching" },
                { id: "rea-word-formation", name: "Word Formation & Jumbled Letters" },
                { id: "rea-misc", name: "Other / Unclassified Reasoning" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "ga",
      name: "General Awareness",
      short: "General Awareness",
      icon: "🌍",
      qRange: [26, 50],
      chapters: [
        {
          id: "indian-polity",
          name: "Indian Polity & Constitution",
          topics: [
            {
              id: "constitutional-framework",
              name: "Constitutional Framework & Amendments",
              microTopics: [
                { id: "ga-pol-sources-preamble", name: "Sources of Constitution, Preamble & Schedules" },
                { id: "ga-pol-amendments", name: "Landmark Constitutional Amendments (42nd, 44th, 86th, etc.)" }
              ]
            },
            {
              id: "fundamental-rights-duties",
              name: "Fundamental Rights, DPSP & Duties",
              microTopics: [
                { id: "ga-pol-fr-equality", name: "Articles 14–18 (Right to Equality)" },
                { id: "ga-pol-fr-freedom", name: "Articles 19–22 (Right to Freedom)" },
                { id: "ga-pol-fr-writs", name: "Article 32 & 226 (Writs Jurisdiction)" },
                { id: "ga-pol-dpsp-duties", name: "Directive Principles (Art 36–51) & Fundamental Duties (Art 51A)" }
              ]
            },
            {
              id: "executive-legislature",
              name: "Executive, Legislature & Judiciary",
              microTopics: [
                { id: "ga-pol-president-gov", name: "President & Governor (Powers, Impeachment, Ordinances)" },
                { id: "ga-pol-parliament-state", name: "Parliament, Lok Sabha, Rajya Sabha & Bills" },
                { id: "ga-pol-judiciary-bodies", name: "Supreme Court, High Courts, CAG & Election Commission" }
              ]
            },
            {
              id: "criminal-law-justice",
              name: "Criminal Law & Justice",
              microTopics: [
                { id: "ga-pol-criminal-law", name: "BNSS, BNS, BSA, CrPC & Criminal Procedure" }
              ]
            }
          ]
        },
        {
          id: "history",
          name: "History & Culture",
          topics: [
            {
              id: "ancient-india",
              name: "Ancient India",
              microTopics: [
                { id: "ga-hist-indus-vedic", name: "Indus Valley Civilization & Vedic Age" },
                { id: "ga-hist-buddhism-jainism", name: "Buddhism, Jainism & Religious Councils" },
                { id: "ga-hist-mauryas-guptas", name: "Mauryan Empire, Gupta Golden Age & Inscriptions" },
                { id: "ga-hist-south-dynasties", name: "Cholas, Pallavas, Rashtrakutas & Chalukyas" }
              ]
            },
            {
              id: "medieval-india",
              name: "Medieval India",
              microTopics: [
                { id: "ga-hist-delhi-sultanate", name: "Delhi Sultanate (Dynasties, Administration & Reforms)" },
                { id: "ga-hist-mughals", name: "Mughal Empire (Babur to Aurangzeb, Land Revenue & Battles)" },
                { id: "ga-hist-vijayanagar-marathas", name: "Vijayanagara Empire & Maratha Confederacy" }
              ]
            },
            {
              id: "modern-india",
              name: "Modern India & Freedom Struggle",
              microTopics: [
                { id: "ga-hist-1857-viceroys", name: "Revolt of 1857, Governor-Generals & Viceroys" },
                { id: "ga-hist-congress-gandhi", name: "INC Sessions, Non-Cooperation, Civil Disobedience & Quit India" },
                { id: "ga-hist-freedom-movements", name: "Socio-Religious Reformers & Revolutionary Leaders" }
              ]
            },
            {
              id: "art-culture",
              name: "Art & Culture (High Yield)",
              microTopics: [
                { id: "ga-art-classical-folk-dance", name: "Classical & Folk Dances of Indian States" },
                { id: "ga-art-music-gharanas", name: "Musical Instruments & Renowned Exponents (Gharanas)" },
                { id: "ga-art-festivals-fairs", name: "Cultural Festivals, Fairs & State Celebrations" },
                { id: "ga-art-temple-architecture", name: "Temple Styles (Nagara, Dravida), Caves & UNESCO Sites" }
              ]
            }
          ]
        },
        {
          id: "geography",
          name: "Geography",
          topics: [
            {
              id: "physical-geography",
              name: "Physical & World Geography",
              microTopics: [
                { id: "ga-geo-earth-solar", name: "Solar System, Earth Layers, Longitudes & Latitudes" },
                { id: "ga-geo-atmosphere-climate", name: "Atmospheric Layers, Winds, Cyclones & Ocean Currents" }
              ]
            },
            {
              id: "indian-geography",
              name: "Indian Geography",
              microTopics: [
                { id: "ga-geo-rivers-dams", name: "River Systems (Himalayan vs Peninsular) & Multipurpose Dams" },
                { id: "ga-geo-mountains-passes", name: "Mountain Ranges, Himalayan Passes & Peaks" },
                { id: "ga-geo-monsoon-soils", name: "Indian Monsoon, Climate Zones & Soil Types" },
                { id: "ga-geo-national-parks", name: "National Parks, Biosphere Reserves & Ramsar Sites" }
              ]
            },
            {
              id: "economic-census",
              name: "Economic Geography & Census",
              microTopics: [
                { id: "ga-geo-minerals-crops", name: "Agriculture, Cropping Seasons & Mineral Belts" },
                { id: "ga-geo-census-2011", name: "Census of India 2011 Demographics & Literacy" }
              ]
            }
          ]
        },
        {
          id: "economy",
          name: "Indian Economy",
          topics: [
            {
              id: "macroeconomics",
              name: "Macroeconomic Concepts",
              microTopics: [
                { id: "ga-eco-national-income", name: "GDP, GNP, NNP & Real vs Nominal Income" },
                { id: "ga-eco-inflation-money", name: "Inflation Indices (CPI, WPI) & Money Supply" }
              ]
            },
            {
              id: "banking-fiscal",
              name: "Banking & Fiscal Policy",
              microTopics: [
                { id: "ga-eco-rbi-monetary", name: "RBI Monetary Tools (Repo Rate, Reverse Repo, CRR, SLR)" },
                { id: "ga-eco-budget-taxation", name: "Union Budget, Direct/Indirect Taxes & Fiscal Deficits" }
              ]
            },
            {
              id: "planning-schemes",
              name: "Planning & Government Schemes",
              microTopics: [
                { id: "ga-eco-five-year-plans", name: "Five Year Plans & NITI Aayog Initiatives" },
                { id: "ga-eco-gov-schemes", name: "Flagship Welfare Schemes & Economic Programs" }
              ]
            }
          ]
        },
        {
          id: "general-science",
          name: "General Science",
          topics: [
            {
              id: "physics",
              name: "Physics",
              microTopics: [
                { id: "ga-sci-units-dimensions", name: "SI Units, Dimensions & Scientific Instruments" },
                { id: "ga-sci-motion-gravity", name: "Newton's Laws, Gravitation & Work-Power-Energy" },
                { id: "ga-sci-optics-sound", name: "Lenses, Mirrors, Refraction, Rainbow & Sound Waves" },
                { id: "ga-sci-heat-electricity", name: "Heat, Thermodynamics, Electric Current & Magnetism" }
              ]
            },
            {
              id: "chemistry",
              name: "Chemistry",
              microTopics: [
                { id: "ga-sci-periodic-table", name: "Periodic Table, Atomic Structure & Periodic Trends" },
                { id: "ga-sci-acids-bases-salts", name: "Acids, Bases, pH Scale & Chemical Indicators" },
                { id: "ga-sci-metals-carbon", name: "Metals, Non-Metals, Alloys & Carbon Compounds" },
                { id: "ga-sci-everyday-chemistry", name: "Common Chemical Compounds, Polymers & Fertilisers" }
              ]
            },
            {
              id: "biology",
              name: "Biology",
              microTopics: [
                { id: "ga-sci-cell-genetics", name: "Cell Organelles, Cell Division & Genetics" },
                { id: "ga-sci-human-physiology", name: "Digestive, Circulatory, Nervous & Endocrine Systems" },
                { id: "ga-sci-diseases-immunity", name: "Pathogens, Infectious Diseases & Immunity" },
                { id: "ga-sci-vitamins-nutrition", name: "Vitamins, Minerals & Deficiency Diseases" },
                { id: "ga-sci-plant-kingdom", name: "Plant Tissues, Photosynthesis & Plant Hormones" }
              ]
            }
          ]
        },
        {
          id: "static-gk-current",
          name: "Static GK & Current Affairs",
          topics: [
            {
              id: "static-gk",
              name: "Static General Knowledge",
              microTopics: [
                { id: "ga-gk-books-authors", name: "Famous Historical Books & Personalities' Autobiographies" },
                { id: "ga-gk-org-headquarters", name: "International Organizations & Headquarters" },
                { id: "ga-gk-firsts-records", name: "First in India & World, Superlatives & Landmarks" },
                { id: "ga-gk-sports-stadiums", name: "Major Stadiums, Trophies & Terminology" },
                { id: "ga-gk-misc", name: "Miscellaneous GK (Unclassified)" }
              ]
            },
            {
              id: "current-affairs",
              name: "Current Affairs & Awards",
              microTopics: [
                { id: "ga-ca-sports-awards", name: "Major Tournaments, Grand Slams & Winners" },
                { id: "ga-ca-national-awards", name: "Bharat Ratna, Padma Awards, Khel Ratna & Film Awards" },
                { id: "ga-ca-summits-appointments", name: "High-Level Summits, Exercises & Key Appointments" },
                { id: "ga-ca-reports-indices", name: "Reports, Indices & Global Rankings" },
                { id: "ga-ca-space-defence", name: "Space Missions, Defence Exercises & Sci-Tech Current Affairs" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "quant",
      name: "Quantitative Aptitude",
      short: "Quantitative Aptitude",
      icon: "🧮",
      qRange: [51, 75],
      chapters: [
        {
          id: "arithmetic-percentages",
          name: "Percentages",
          topics: [
            {
              id: "percentage-change",
              name: "Percentage Change & Applications",
              microTopics: [
                { id: "pct-fraction-conv", name: "Fraction to Percentage Equivalents" },
                { id: "pct-successive-formula", name: "Successive Percentage (a + b + ab/100)" },
                { id: "pct-price-consumption", name: "Price × Consumption = Expenditure Invariance" },
                { id: "pct-depreciation-population", name: "Population & Machine Value Depreciation" },
                { id: "pct-exam-passing", name: "Examination Passing Marks & Candidates" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-averages",
          name: "Averages",
          topics: [
            {
              id: "averages-basics",
              name: "Average Problems",
              microTopics: [
                { id: "avg-basic", name: "Simple Average of Numbers & Series" },
                { id: "avg-weighted", name: "Weighted Average & Group Averages" },
                { id: "avg-change", name: "Change in Average (Add / Remove / Replace)" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-profit-loss",
          name: "Profit, Loss & Discount",
          topics: [
            {
              id: "cost-selling-price",
              name: "Cost & Selling Price",
              microTopics: [
                { id: "pl-basic-cpsp", name: "Basic CP, SP & Profit/Loss%" },
                { id: "pl-multiple-articles", name: "Equating CP of X articles with SP of Y" },
                { id: "pl-gain-loss-equal", name: "Selling at Same SP with Equal Gain & Loss" }
              ]
            },
            {
              id: "discount-marked-price",
              name: "Discount & Marked Price",
              microTopics: [
                { id: "pl-successive-discount", name: "Successive Discounts (Equivalent Single Discount)" },
                { id: "pl-buy-x-get-y", name: "'Buy X Get Y Free' Scheme Discount" },
                { id: "pl-cp-mp-relation", name: "Relation between CP, MP, Profit% & Discount%" }
              ]
            },
            {
              id: "dishonest-trade",
              name: "Dishonest Trade & Weights",
              microTopics: [
                { id: "pl-dishonest-weights", name: "Faulty Weights & Measurement Fraud" },
                { id: "pl-dishonest-markup-weight", name: "Combined Markup with Faulty Weights" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-ratio-proportion",
          name: "Ratio, Proportion & Mixture",
          topics: [
            {
              id: "ratio-proportions",
              name: "Ratio & Proportions",
              microTopics: [
                { id: "ratio-mean-third-fourth", name: "Mean, Third & Fourth Proportional" },
                { id: "ratio-income-expenditure", name: "Income, Expenditure & Savings Proportions" },
                { id: "ratio-coins-denominations", name: "Coins, Currency Notes & Total Values" }
              ]
            },
            {
              id: "partnership-ages",
              name: "Partnership & Age Problems",
              microTopics: [
                { id: "part-simple-compound", name: "Investment × Time Ratio" },
                { id: "age-ratio-problems", name: "Age Ratios (Past, Present & Future)" }
              ]
            },
            {
              id: "mixture-alligation",
              name: "Mixture & Alligation",
              microTopics: [
                { id: "mix-replacement-liquid", name: "Repeated Liquid Replacement x(1-y/x)^n" },
                { id: "mix-alligation-rule", name: "Alligation on Prices, Averages & Percentages" },
                { id: "mix-two-three-alloys", name: "Mixing Ratios in Two or Three Alloys" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-time-work",
          name: "Time, Work & Pipes",
          topics: [
            {
              id: "time-work-basics",
              name: "Time & Work",
              microTopics: [
                { id: "tw-efficiency-individual", name: "Individual Work Efficiency & Time" },
                { id: "tw-alternate-days", name: "Alternating Days Work Schedules" },
                { id: "tw-leaving-joining", name: "Workers Leaving Before/After Completion" },
                { id: "tw-men-women-days", name: "Men, Women, Children MDH Formula (M1D1H1/W1)" },
                { id: "tw-wages-distribution", name: "Wage Distribution Proportional to Work" }
              ]
            },
            {
              id: "pipes-cistern",
              name: "Pipes & Cistern",
              microTopics: [
                { id: "pipe-inlet-outlet", name: "Combined Inlet & Outlet Filling Time" },
                { id: "pipe-leak-emptying", name: "Tank Leakage & Emptying Rates" },
                { id: "pipe-alternating", name: "Alternating Pipe Operations" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-speed-distance",
          name: "Speed, Time & Distance",
          topics: [
            {
              id: "speed-time-basics",
              name: "Speed & Distance Basics",
              microTopics: [
                { id: "spd-average-speed", name: "Average Speed (Harmonic Mean vs Total Distance/Time)" },
                { id: "spd-relative-speed", name: "Relative Speed in Same & Opposite Directions" },
                { id: "spd-stoppage-time", name: "Stoppage Time per Hour Calculation" }
              ]
            },
            {
              id: "trains-platforms",
              name: "Trains & Platforms",
              microTopics: [
                { id: "trn-crossing-pole-platform", name: "Train Crossing Pole/Man vs Platform/Bridge" },
                { id: "trn-two-trains", name: "Two Trains Crossing Each Other" }
              ]
            },
            {
              id: "boats-streams-races",
              name: "Boats, Streams & Races",
              microTopics: [
                { id: "boat-upstream-downstream", name: "Upstream, Downstream & Still Water Speeds" },
                { id: "race-linear-circular", name: "Linear & Circular Track Races (Head-start/Beats by)" }
              ]
            }
          ]
        },
        {
          id: "arithmetic-interest",
          name: "Simple & Compound Interest",
          topics: [
            {
              id: "simple-interest",
              name: "Simple Interest",
              microTopics: [
                { id: "si-basic-formula", name: "Direct Simple Interest & Principal Calculation" },
                { id: "si-sum-n-times", name: "Sum Becoming N Times in Given Years" }
              ]
            },
            {
              id: "compound-interest",
              name: "Compound Interest",
              microTopics: [
                { id: "ci-compounding-periods", name: "Annual, Half-Yearly & Quarterly Compounding" },
                { id: "ci-si-difference", name: "2-Year & 3-Year Difference between CI and SI" },
                { id: "ci-effective-rate", name: "Effective Rate Percentage Method" },
                { id: "ci-installments", name: "Annual Installments & Equal Repayments" }
              ]
            }
          ]
        },
        {
          id: "algebra",
          name: "Algebra",
          topics: [
            {
              id: "algebraic-identities",
              name: "Algebraic Identities",
              microTopics: [
                { id: "alg-x-plus-reciprocal", name: "x + 1/x = k => x^2+1/x^2, x^3+1/x^3, x^4, x^5" },
                { id: "alg-x-minus-reciprocal", name: "Inversion between x + 1/x and x - 1/x" },
                { id: "alg-special-constants", name: "x + 1/x = 1 => x^3 = -1 and x + 1/x = √3 => x^6 = -1" }
              ]
            },
            {
              id: "cubic-polynomials",
              name: "Cubic & Special Polynomials",
              microTopics: [
                { id: "alg-a3-b3-c3", name: "a^3+b^3+c^3 - 3abc (Condition a+b+c=0)" },
                { id: "alg-value-putting", name: "Value Substitution & Degree Homogeneity" },
                { id: "alg-remainder-factor", name: "Remainder Theorem & Polynomial Roots" }
              ]
            },
            {
              id: "equations-roots",
              name: "Equations & Roots",
              microTopics: [
                { id: "alg-linear-two-var", name: "Systems of Linear Equations in Two Variables" },
                { id: "alg-quadratic-roots", name: "Quadratic Equation Roots (α+β, αβ)" }
              ]
            }
          ]
        },
        {
          id: "geometry",
          name: "Geometry",
          topics: [
            {
              id: "lines-angles-triangles",
              name: "Lines, Angles & Triangles",
              microTopics: [
                { id: "geom-parallel-angles", name: "Parallel Lines & Transversal Angle Chasing" },
                { id: "geom-triangle-centers", name: "Incenter, Circumcenter, Orthocenter & Centroid" },
                { id: "geom-similarity-thales", name: "Triangle Similarity, Congruence & Thales Theorem" }
              ]
            },
            {
              id: "circles",
              name: "Circles",
              microTopics: [
                { id: "geom-tangent-secant", name: "Tangents & Secants (PT^2 = PA·PB, Intersecting Chords)" },
                { id: "geom-common-tangents", name: "Direct & Transverse Common Tangents" },
                { id: "geom-cyclic-quad", name: "Cyclic Quadrilateral & Opposite Angle Theorems" },
                { id: "geom-chord-properties", name: "Chords Equidistant from Center & Perpendicular Bisector" }
              ]
            },
            {
              id: "quadrilaterals-polygons",
              name: "Quadrilaterals & Regular Polygons",
              microTopics: [
                { id: "geom-regular-polygons", name: "Regular Polygons (Interior/Exterior Angles, Diagonals)" },
                { id: "geom-rhombus-trapezium", name: "Rhombus (d1^2+d2^2=4a^2) & Trapezium Properties" }
              ]
            }
          ]
        },
        {
          id: "mensuration",
          name: "Mensuration 2D & 3D",
          topics: [
            {
              id: "mensuration-2d",
              name: "2D Mensuration (Perimeter & Area)",
              microTopics: [
                { id: "mens-circle-sector", name: "Circle, Sector & Segment Areas" },
                { id: "mens-triangles-area", name: "Triangle Area (Heron's Formula, Inradius, Circumradius)" },
                { id: "mens-shaded-regions", name: "Pathway, Lawn & Shaded Composite Regions" }
              ]
            },
            {
              id: "mensuration-3d",
              name: "3D Mensuration (Volume & Surface Area)",
              microTopics: [
                { id: "mens-cylinder-cone", name: "Cylinder, Cone & Frustum Surface Area & Volume" },
                { id: "mens-sphere-hemisphere", name: "Sphere & Hemisphere (Melting & Recasting Problems)" },
                { id: "mens-cuboid-cube", name: "Cuboid, Cube & Diagonal Lengths" },
                { id: "mens-prism-pyramid", name: "Right Prism & Regular Pyramid" }
              ]
            }
          ]
        },
        {
          id: "trigonometry",
          name: "Trigonometry",
          topics: [
            {
              id: "trig-identities",
              name: "Trigonometric Identities & Angles",
              microTopics: [
                { id: "trig-pythagorean-identities", name: "sin^2θ+cos^2θ=1, sec^2θ-tan^2θ=1" },
                { id: "trig-complementary-angles", name: "Complementary Angles (sin(90-θ)=cosθ, tanA tanB = 1)" },
                { id: "trig-specific-values", name: "Standard Values (0°, 30°, 45°, 60°, 90°)" },
                { id: "trig-max-min", name: "Maxima & Minima of Trigonometric Functions" }
              ]
            },
            {
              id: "heights-distances",
              name: "Heights & Distances",
              microTopics: [
                { id: "trig-angles-elevation", name: "Angle of Elevation & Depression Standard Ratios" }
              ]
            }
          ]
        },
        {
          id: "number-system",
          name: "Number System & Simplification",
          topics: [
            {
              id: "divisibility-factors",
              name: "Divisibility & Factors",
              microTopics: [
                { id: "num-divisibility-rules", name: "Divisibility by 3, 7, 8, 9, 11, 72, 88" },
                { id: "num-unit-digit", name: "Unit Digit & Cyclicity of Powers" },
                { id: "num-factors-multiples", name: "Total, Even & Odd Factors Count and Sum" },
                { id: "num-trailing-zeros", name: "Number of Trailing Zeros in Products / Factorials" }
              ]
            },
            {
              id: "fractions-remainders",
              name: "Fractions & Remainders",
              microTopics: [
                { id: "num-fraction-compare", name: "Comparison of Fractions (Ascending / Descending Order)" },
                { id: "num-remainder-theorems", name: "Remainder Theorems & Power Cycles" },
                { id: "num-surds-indices", name: "Surds & Indices Simplification & Comparison" },
                { id: "num-lcm-hcf", name: "LCM & HCF Applications (Bell Tolls, Minimum Distances)" },
                { id: "quant-misc", name: "Other / Unclassified Quant" }
              ]
            }
          ]
        },
        {
          id: "data-interpretation",
          name: "Data Interpretation",
          topics: [
            {
              id: "charts-tables",
              name: "Charts & Tables",
              microTopics: [
                { id: "di-table-chart", name: "Tabular Data Analysis" },
                { id: "di-bar-graph", name: "Single & Multiple Bar Charts" },
                { id: "di-pie-chart", name: "Pie Chart (Degree to Percentage Conversion)" },
                { id: "di-line-graph", name: "Line Graphs & Trend Tracking" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "english",
      name: "English Comprehension",
      short: "English",
      icon: "📖",
      qRange: [76, 100],
      chapters: [
        {
          id: "grammar-rules",
          name: "Grammar Rules",
          topics: [
            {
              id: "subject-verb-agreement",
              name: "Subject-Verb Agreement",
              microTopics: [
                { id: "eng-sva-singular-plural", name: "Singular vs Plural Subjects & Compound Subjects" },
                { id: "eng-sva-correlative", name: "Either-Or, Neither-Nor, Along With, As Well As" },
                { id: "eng-sva-collective-nouns", name: "Collective Nouns & Distributive Pronouns (Each / Every)" }
              ]
            },
            {
              id: "tenses-conditionals",
              name: "Tenses & Conditionals",
              microTopics: [
                { id: "eng-tense-perfect-past", name: "Present/Past Perfect vs Simple Past" },
                { id: "eng-tense-conditional", name: "Conditional Clauses (If + had + V3 ... would + have + V3)" }
              ]
            },
            {
              id: "prepositions-phrasal",
              name: "Prepositions & Phrasal Verbs",
              microTopics: [
                { id: "eng-prep-fixed", name: "Fixed Prepositions with Adjectives & Verbs" },
                { id: "eng-prep-confusing", name: "Between vs Among, Since vs For, Beside vs Besides" },
                { id: "eng-phrasal-verbs", name: "High-Frequency Phrasal Verbs" }
              ]
            },
            {
              id: "parts-of-speech",
              name: "Parts of Speech & Modifiers",
              microTopics: [
                { id: "eng-modifiers-conjunctions", name: "Correlative Conjunctions, Adjective vs Adverb" },
                { id: "eng-pronoun-cases", name: "Relative Pronouns (Who vs Whom) & Objective Cases" },
                { id: "eng-articles-determiners", name: "Definite vs Indefinite Article Rules" }
              ]
            }
          ]
        },
        {
          id: "voice-narration",
          name: "Voice & Narration",
          topics: [
            {
              id: "active-passive-voice",
              name: "Active & Passive Voice",
              microTopics: [
                { id: "eng-voice-assertive", name: "Assertive Tense Transformations" },
                { id: "eng-voice-imperative", name: "Imperative Sentences (Let + be + V3)" },
                { id: "eng-voice-interrogative", name: "Interrogative Transformations" }
              ]
            },
            {
              id: "direct-indirect-speech",
              name: "Direct & Indirect Speech",
              microTopics: [
                { id: "eng-narr-assertive", name: "Tense & Pronoun Shifts in Assertive Sentences" },
                { id: "eng-narr-interrogative", name: "Questions (If/Whether vs Wh-words)" },
                { id: "eng-narr-imperative-exclam", name: "Orders, Requests & Exclamatory Sentences" }
              ]
            }
          ]
        },
        {
          id: "vocabulary",
          name: "Vocabulary",
          topics: [
            {
              id: "synonyms-antonyms",
              name: "Synonyms & Antonyms",
              microTopics: [
                { id: "eng-vocab-synonym", name: "High-Frequency SSC Synonyms" },
                { id: "eng-vocab-antonym", name: "High-Frequency SSC Antonyms" }
              ]
            },
            {
              id: "idioms-phrases",
              name: "Idioms & Phrases",
              microTopics: [
                { id: "eng-idiom-actions", name: "Action, Body-Part & Emotion Idioms" },
                { id: "eng-idiom-nature-animals", name: "Animal & Color Idioms" },
                { id: "eng-proverb-expressions", name: "Traditional Proverbs & Figurative Phrases" }
              ]
            },
            {
              id: "one-word-substitution",
              name: "One Word Substitution",
              microTopics: [
                { id: "eng-ows-gov-society", name: "Types of Government, Systems & Social Forms" },
                { id: "eng-ows-phobias-manias", name: "Phobias, Manias & Obsessions" },
                { id: "eng-ows-specialists", name: "Scientific Fields, Professions & Character Traits" }
              ]
            },
            {
              id: "spelling-check",
              name: "Spelling Correction",
              microTopics: [
                { id: "eng-spell-double-consonant", name: "Double Letters & Confusing Vowels" }
              ]
            }
          ]
        },
        {
          id: "discourse-comprehension",
          name: "Discourse & Reading",
          topics: [
            {
              id: "cloze-test",
              name: "Cloze Test",
              microTopics: [
                { id: "eng-cloze-grammar", name: "Contextual Grammar Gap Fills" },
                { id: "eng-cloze-vocabulary", name: "Collocation & Contextual Word Fills" }
              ]
            },
            {
              id: "para-jumbles",
              name: "Para Jumbles & Rearrangement",
              microTopics: [
                { id: "eng-jumble-mandatory-pairs", name: "Sentence Rearrangement & Mandatory Pairs" }
              ]
            },
            {
              id: "reading-comprehension",
              name: "Reading Comprehension",
              microTopics: [
                { id: "eng-rc-factual", name: "Direct Fact & Detail Retrieval" },
                { id: "eng-rc-inference-title", name: "Central Idea, Theme & Author's Tone" },
                { id: "eng-misc", name: "Other / Unclassified English" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const targetPath = path.resolve("taxonomy.json");
await fs.writeFile(targetPath, JSON.stringify(TAXONOMY, null, 2), "utf8");
console.log(`Successfully generated taxonomy.json with ${TAXONOMY.subjects.length} subjects.`);

