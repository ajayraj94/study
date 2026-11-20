import json, glob, re, html, collections, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def norm(s):
    s = html.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def key(s):
    s = norm(s).lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

tags = json.load(open(os.path.join(ROOT, "tags-index.json"), encoding="utf-8"))
ga = tags["hierarchy"]["ga"]

qmap = {}
chapter_order = []
topic_order = []
for cid, c in ga["chapters"].items():
    chapter_order.append((cid, c["name"], c.get("totalQuestions", 0)))
    for tid, t in c.get("topics", {}).items():
        topic_order.append((cid, tid, t["name"]))
        for mid, m in t.get("microTopics", {}).items():
            for ref in m.get("questionRefs", []):
                qmap[ref["id"]] = {
                    "chapter": c["name"], "chapterId": cid,
                    "topic": t["name"], "topicId": tid,
                    "micro": m["name"], "microId": mid,
                    "shift": ref.get("shiftLabel", ""),
                    "mock": ref.get("mockId", ""),
                    "qnum": ref.get("qNum", 0),
                }

rows = []
seen_ids = set()
for f in sorted(glob.glob(os.path.join(ROOT, "2025", "*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    for q in d["questions"]:
        if q.get("section") != "General Awareness":
            continue
        qid = q["id"]
        if qid in seen_ids:
            continue
        seen_ids.add(qid)
        t = qmap.get(qid, {})
        rows.append({
            "id": qid,
            "shift": d["test_title"].replace("SSC CGL 2025 (Held On: ", "").rstrip(")"),
            "qnum": q.get("number"),
            "section_q": q.get("section_question_number"),
            "question": norm(q.get("question", "")),
            "options": {k: norm(v) for k, v in (q.get("options") or {}).items()},
            "answer": norm(q.get("correct_answer", "")),
            "correct_option": q.get("correct_option", ""),
            "solution": q.get("solution", ""),
            "chapter": t.get("chapter", "Untagged"),
            "chapterId": t.get("chapterId", ""),
            "topic": t.get("topic", ""),
            "micro": t.get("micro", ""),
        })

# repeat counts: exact normalized question text
qcount = collections.Counter(key(r["question"]) for r in rows)
# answer-based duplicate signal
acount = collections.Counter(key(r["answer"]) for r in rows)
for r in rows:
    r["repeat"] = qcount[key(r["question"])]
    r["answerRepeat"] = acount[key(r["answer"])]

out = {
    "rows": rows,
    "chapters": chapter_order,
    "topics": topic_order,
    "stats": {
        "total": len(rows),
        "byChapter": dict(collections.Counter(r["chapter"] for r in rows)),
        "uniqueQuestions": len(qcount),
        "repeatedQuestions": sum(1 for r in rows if r["repeat"] > 1),
        "topRepeats": qcount.most_common(25),
        "answerKinds": dict(collections.Counter(r["answer"] for r in rows).most_common(15)),
    },
}
json.dump(out, open(os.path.join(ROOT, "tools", "ga_360_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(out["stats"], ensure_ascii=False, indent=1)[:4000])
print("untagged:", sum(1 for r in rows if r["chapter"] == "Untagged"))
