"""Section-level coverage audit of 'Art and Culture.html' + 'Polity.html'
against all 81 SSC CGL shift JSONs (25 GA questions each).

Method
1. Parse each HTML's JS data layer into per-subtopic sections, tagged with
   the Art unit (u1..u11) or Polity chapter (1..19).
2. Map each GA micro-topic to the sections that teach it.
3. A question counts as answerable only if the correct answer (all significant
   tokens) appears inside one of those mapped sections - i.e. the note teaches
   that exact fact.
"""

import json, glob, re, html, os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BS = chr(92)


def strip_tags(s):
    s = html.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def key(s):
    s = strip_tags(s).lower()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


STOP = set("""a an the of in on at to for from by with and or is are was were be been being
as its it this that these those which who whom whose what when where why how than then
india indian following correct answer statement statements consider pairs pair match
list select option given below above not true false all any each other into over under
about during between among within without also has have had do does did can could
will would shall should may might must name named called known largest smallest highest
lowest first second third new old country state city year years according used using use
well known popular famous important major main best good great large small
one two three four five six seven eight nine ten respectively""".split())


def toks(s):
    return [t for t in key(s).split() if t not in STOP and len(t) > 2]


def stoks(s):
    """Stemmed-ish token set (drop plural s)."""
    out = set()
    for t in toks(s):
        out.add(t[:-1] if len(t) > 4 and t.endswith("s") else t)
    return out


def bt_fields(src):
    out = []
    for m in re.finditer(r"(\w+):\s*`", src):
        name, i, buf = m.group(1), m.end(), []
        while i < len(src):
            c = src[i]
            if c == BS:
                buf.append(src[i:i + 2]); i += 2; continue
            if c == "`":
                break
            buf.append(c); i += 1
        out.append((name, "".join(buf)))
    return out


def load_sections(path, label, anchor_field):
    src = open(path, encoding="utf-8").read()
    src = re.sub(r"<style.*?</style>", " ", src, flags=re.S | re.I)
    starts = [m.start() for m in re.finditer(r"\b" + anchor_field + r":\s*`", src)]
    out = []
    for i, a in enumerate(starts):
        b = starts[i + 1] if i + 1 < len(starts) else src.find("</script>", a)
        chunk = src[a:b]
        m = re.match(anchor_field + r":\s*`([^`]*)`", chunk)
        ident = m.group(1) if m else ""
        tm = re.search(r"\btitle:\s*`([^`]*)`", chunk)
        title = strip_tags(tm.group(1)) if tm else ""
        # keep block structure: rows / list items / paragraphs become lines
        raw = html.unescape(chunk).lower().replace("\u00a0", " ")
        raw = re.sub(r"</(?:tr|li|p|div|h[1-6]|td|th|table)>|<br\s*/?>", "\n", raw)
        raw = re.sub(r"<[^>]+>", " ", raw)
        raw = raw.replace("`, `", "\n")
        lines = []
        for ln in raw.split("\n"):
            ln = re.sub(r"\b(?:title|summary|story|storylink|landmark|takeaway|articles|"
                        r"code|id|unitid|badge|category|overview|contenthtml|question|"
                        r"explanation|front|back|points|format|type)\b", " ", ln)
            ln = re.sub(r"\s+", " ", ln).strip(" `,;:")
            if len(ln) >= 8:
                lines.append((ln, stoks(ln)))
        if not lines:
            continue
        body = " ; ".join(ln for ln, _ in lines)
        sents = lines
        if label == "art":
            um = re.match(r"u(\d+)", ident or "")
            group = "u" + um.group(1) if um else ""
        else:
            group = (ident or "").split(".")[0]
        out.append({"file": label, "group": group, "id": ident, "title": title,
                    "text": body, "tokens": stoks(body), "sents": sents})
    return out


ART = load_sections(os.path.join(ROOT, "Art and Culture.html"), "art", "id")
POL = load_sections(os.path.join(ROOT, "Polity.html"), "polity", "code")

# micro-topic -> (file, groups)
# Polity file covers all 19 chapters, so polity-tagged questions search the
# whole polity corpus; art questions search units 1-10 (unit 11 = practice).
POL_ALL = {str(i) for i in range(1, 20)}
ART_ALL = {"u" + str(i) for i in range(1, 11)}
SCOPE = {
    # ---- Art & Culture file ----
    ("History & Culture", "Temple Styles (Nagara, Dravida), Caves & UNESCO Sites"): [("art", ART_ALL)],
    ("History & Culture", "Classical & Folk Dances of Indian States"): [("art", ART_ALL)],
    ("History & Culture", "Musical Instruments & Renowned Exponents (Gharanas)"): [("art", ART_ALL)],
    ("History & Culture", "Cultural Festivals, Fairs & State Celebrations"): [("art", ART_ALL)],
    ("Static GK & Current Affairs", "Bharat Ratna, Padma Awards, Khel Ratna & Film Awards"): [("art", ART_ALL)],
    # ---- Polity file ----
    ("Indian Polity & Constitution", "Article 32 & 226 (Writs Jurisdiction)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Articles 14–18 (Right to Equality)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Articles 19–22 (Right to Freedom)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Directive Principles (Art 36–51) & Fundamental Duties (Art 51A)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Landmark Constitutional Amendments (42nd, 44th, 86th, etc.)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Parliament, Lok Sabha, Rajya Sabha & Bills"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "President & Governor (Powers, Impeachment, Ordinances)"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "Sources of Constitution, Preamble & Schedules"): [("polity", POL_ALL), ("art", {"u9"})],
    ("Indian Polity & Constitution", "Supreme Court, High Courts, CAG & Election Commission"): [("polity", POL_ALL)],
    ("Indian Polity & Constitution", "BNSS, BNS, BSA, CrPC & Criminal Procedure"): [("polity", POL_ALL)],
}


GENERIC = set("""which following state states country countries city district place region area
indian india world largest smallest first second third number total famous known called
name named year years during between among under about above below into from with
their they them there where when what who whom whose how many much more most other
according associated related belongs located situated established founded built made
written author wrote book books award awards given received honoured honored got
article articles constitution act acts committee commission department ministry
government national international general public indian india organisation organization
body bodies member members part parts section sections schedule schedules list lists
used use using describes described deals deal called known as per between""".split())


def df_map(pool):
    df = Counter()
    for s in pool:
        for t in s["tokens"]:
            df[t] += 1
    return df


DF = {"art": df_map(ART), "polity": df_map(POL)}


def near(a, b):
    """Cheap fuzzy token identity for spelling variants."""
    if a == b:
        return True
    if len(a) >= 5 and len(b) >= 5 and (a.startswith(b) or b.startswith(a)):
        return True
    if abs(len(a) - len(b)) > 1 or len(a) < 6:
        return False
    # one substitution / insertion / deletion
    i = j = diff = 0
    while i < len(a) and j < len(b):
        if a[i] != b[j]:
            diff += 1
            if diff > 1:
                return False
            if len(a) > len(b):
                i += 1
            elif len(b) > len(a):
                j += 1
            else:
                i += 1; j += 1
        else:
            i += 1; j += 1
    return True


PLACE = set("""india indian bharat world asia europe africa america english hindi
state states country countries nation government constitution parliament court
north south east west centre central union assembly council ministry department""".split())


def anchors(question):
    """Specific subject terms of a question:
    proper nouns where present, else rare tokens, plus article/section numbers."""
    raw = strip_tags(question)
    words = re.findall(r"[A-Za-z][A-Za-z'&\-]+", raw)
    proper = [w for w in words if w[:1].isupper()]
    # drop the capitalised first word of the sentence unless it repeats later
    low = [w.lower() for w in proper]
    rest = [w for w in low if low.count(w) > 1 or w not in low[:1]]
    bad = GENERIC | PLACE
    props = [t for t in {key(w) for w in rest} if t and t not in bad and len(t) > 2]
    nums = re.findall(r"\b(?:article|art\.?|section|schedule|part)\s+(\d+[a-z]?)\b", raw, re.I)
    if props:
        return props, [n.lower() for n in nums]
    return [t for t in toks(question) if t not in bad and len(t) > 3 and not t.isdigit()], \
           [n.lower() for n in nums]


LABEL_RE = re.compile(
    r"^(?:(?:only|both|all)\s+)?[1-4](?:\s*(?:and|&|,)\s*[1-4])*(?:\s+only)?$"
    r"|^(?:both|all)\b.*"
    r"|^[ivx]+\s*\([a-d]\).*"
    r"|^[a-d](?:\s*,\s*[a-d])*$")


def is_label_answer(ans):
    return bool(LABEL_RE.match(key(ans)))


def is_sentence_answer(ans):
    """Long option text (statement-style question) - not text-verifiable."""
    return len(key(ans).split()) > 7


def verify(q, ans_tokens, mapped):
    """The answer phrase must appear verbatim in a mapped section that also
    discusses the question's own subject."""
    ans_phrase = key(q.get("correct_answer", ""))
    if not ans_tokens or is_label_answer(q.get("correct_answer", "")) \
            or is_sentence_answer(q.get("correct_answer", "")):
        return None
    qa, qnums = anchors(q.get("question", ""))
    pats = [r"\b" + re.escape(ans_phrase) + r"\b"]
    # short/compound answers: also accept the single distinctive head word
    at = [t for t in key(q.get("correct_answer", "")).split() if len(t) > 3]
    if len(at) > 1:
        pats.append(r"\b" + re.escape(at[0]) + r"\b")
    ans_re = re.compile("|".join(pats))
    num_re = re.compile(r"\b(?:article|art\.?|section|schedule|part)\s*(?:no\.?\s*)?"
                        r"(" + "|".join(map(re.escape, qnums)) + r")\b") if qnums else None
    for label, groups in mapped:
        pool = ART if label == "art" else POL
        df = DF[label]
        lim = max(4, int(0.12 * len(pool)))
        for s in pool:
            if s["group"] not in groups:
                continue
            rare = [a for a in qa if 1 <= df[a] <= lim]
            if not rare:
                continue
            # subject and answer must share one row / list item / paragraph
            # (table cells can sit on consecutive lines, so allow 2-line spans)
            L = s["sents"]
            for i in range(len(L)):
                text, st = L[i]
                if i + 1 < len(L):
                    text = text + " | " + L[i + 1][0]
                    st = st | L[i + 1][1]
                subj = False
                for a in qa:
                    if df[a] < 1:
                        continue
                    if a in st or any(near(a, t) for t in st if len(t) > 4):
                        subj = True
                        break
                subj = subj or bool(num_re and num_re.search(text))
                if subj and ans_re.search(text):
                    return dict(s, sentence=text[:300])
    return None


# Questions the matcher accepted but manual review of the notes rejected
# (answer text appears in the file, but not as the tested fact).
FALSE_POSITIVES = [
    "draft policy in 2022 for senior", "founded by Mrinalini Sarabhai",
    "idols of which three Gods are installed",
    "Constitution (Scheduled Castes and Scheduled Tribes) Orders",
    "of every state unfurls the flag", "Harivarasanam award",
    "youngest recipient of the Sangeetha Kalanidhi",
    "modifying the list of Scheduled Caste in Tamil Nadu",
    "Environment (Protection) Act, 1986", "'Kuki dance' is a folk dance",
    "GST Council's decisions require what kind of majority",
    "Read the below statement: 1. Solicitor General",
    "Panthi dance is linked to the followers", "Burrakatha in Andhra Pradesh",
    "popularly known as 'Ragam'", "explicitly incorporated in the Bharatiya Nagarik",
    "Chief Justice of the High Court of Jammu and Kashmir",
    "major reforms introduced in BNSS, 2023 with respect to FIRs",
    "administrative bodies were abolished after the enactment",
    "key requirement for admissibility of an elec",
    "aims to align Indian evidence law with advancements",
    "which court may grant default bail",
]


def is_blacklisted(question):
    return any(fp.lower() in question.lower() for fp in FALSE_POSITIVES)


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "year wise folder", "202*", "*.json")))
    shifts = []
    stats = Counter()
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        ga = [q for q in d["questions"] if q.get("section") == "General Awareness"]
        if len(ga) != 25:
            continue
        rows = []
        for q in ga:
            m = q.get("meta") or {}
            mt = (m.get("chapterName"), m.get("microTopicName"))
            ans = strip_tags(q.get("correct_answer", ""))
            mapped = SCOPE.get(mt)
            s = verify(q, stoks(ans), mapped) if mapped else None
            if mapped:
                stats["candidates"] += 1
                stats["hit" if s else "in_scope_miss"] += 1
            if s and is_blacklisted(strip_tags(q.get("question", ""))):
                s = None
            rows.append({
                "qnum": q.get("section_question_number"),
                "chapter": m.get("chapterName"),
                "micro": m.get("microTopicName"),
                "question": strip_tags(q.get("question", "")),
                "answer": ans,
                "option": q.get("correct_option", ""),
                "in_scope": bool(mapped),
                "hit": bool(s),
                "file": s["file"] if s else "",
                "section": s["title"] if s else "",
                "evidence": s.get("sentence", "") if s else "",
            })
        shifts.append({"file": os.path.basename(f), "title": d["test_title"], "rows": rows})

    json.dump({"shifts": shifts}, open(os.path.join(ROOT, "tools", "coverage_audit.json"),
                                      "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("shifts", len(shifts), dict(stats))
    rows = [r for s in shifts for r in s["rows"]]
    print("hits", sum(r["hit"] for r in rows))
    print(Counter(r["file"] for r in rows if r["hit"]))
    print("per shift", Counter(sum(1 for r in s["rows"] if r["hit"]) for s in shifts))


if __name__ == "__main__":
    main()
