#!/usr/bin/env python3
"""Cross-run statistics for the jev-sts2 experiment (all play-mode decisions in logs/decisions.jsonl)."""
import collections
import json
import os
import re

ROOT = os.path.expanduser("~/Projects/sts2-jev/jev-sts2")
DEC = os.path.join(ROOT, "logs/decisions.jsonl")
STATES = os.path.join(ROOT, "logs/states.jsonl")
JEV_PRICE = 0.042  # $/M tokens (handoff estimate)
DS_HIT, DS_MISS, DS_OUT = 0.006, 0.3, 1.2  # deepseek-flash $/M, peak rates (off-peak is half)


# A model's own decision: the brain engine that answered (deepseek, codex, claude; "deepseek (for codex)" when the router's
# fallback did), or a v3 escalator. Before 2026-10-03 every brain answer was logged as "deepseek" (jev-sts2 loop.ts).
BRAIN_DECIDER = re.compile(r"^(deepseek|claude|codex|dsh)( \(for (deepseek|claude|codex|dsh)\))?$")


def is_brain(decider):
    return bool(BRAIN_DECIDER.match(decider or ""))


def brain_direct(r):
    """The brain decided this screen itself (its tokens are the row's usage): any brain decider but a v3 Claude escalation."""
    d = r.get("decider") or ""
    return is_brain(d) and (d != "claude" or not r.get("escalation"))


def brain_engine(r):
    """The engine behind a row's brain call: its note (deepseek.brain / escalation.brain), else the decider's, else deepseek."""
    for key in ("deepseek", "escalation"):
        rec = r.get(key) if isinstance(r.get(key), dict) else {}
        note = rec.get("brain") if isinstance(rec.get("brain"), dict) else {}
        if note.get("engine"):
            return note["engine"]
    d = r.get("decider") or ""
    return d.split(" (for ")[0] if is_brain(d) else "deepseek"


def load(path):
    out = []
    for line in open(path, encoding="utf8"):
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return out


def run_of(r):
    try:
        return json.loads(r["fingerprint"]).get("run")
    except Exception:
        return None


def decider(r):
    lab, rat = r.get("label", ""), r.get("rationale", "")
    if lab == "combat/plan-continue":
        for key, name in (("Jev-chosen", "jev-plan"), ("DeepSeek-chosen", "deepseek-plan"), ("Claude-chosen", "claude-plan")):
            if key in rat:
                return name
        return "code"
    if r.get("decider"):
        return r["decider"]
    if r.get("questions"):
        return "code-fallback" if r.get("fallback") else "jev"
    return "code"


def category(label):
    if label.startswith("combat/"):
        return "战斗"
    return {"reward": "选牌", "shop": "商店", "event": "事件", "map": "路线", "rest": "休息",
            "selection": "选牌界面", "chest": "宝箱"}.get(label.split("/")[0], "其他")


recs = [r for r in load(DEC) if r.get("mode") == "play"]
# Attach run ids: GAME_OVER records carry none, inherit the previous record's run.
last = None
for r in recs:
    rid = run_of(r)
    if rid:
        last = rid
    r["_run"] = rid or last

# ---- runs
states = {}
for s in load(STATES):
    st = s.get("state") or {}
    if st.get("run_id") and st.get("run"):
        states.setdefault(st["run_id"], []).append(st)
runs = collections.OrderedDict()
for r in recs:
    rid = r["_run"]
    if not rid or rid == "run_unknown":
        continue
    info = runs.setdefault(rid, {"floor": 0, "decisions": 0, "start": r["ts"], "end": r["ts"], "over": False, "win": False})
    info["decisions"] += 1
    info["end"] = r["ts"]
    if r.get("floor"):
        info["floor"] = max(info["floor"], r["floor"])
    if r.get("screen") == "GAME_OVER":
        info["over"] = True
for rid, sts in states.items():
    for st in sts:
        go = st.get("game_over") or {}
        if go.get("is_victory"):
            runs.setdefault(rid, {}).update(win=True)

print("## 对局")
for i, (rid, info) in enumerate(runs.items(), 1):
    status = "胜" if info.get("win") else ("负" if info.get("over") else "进行中/中断")
    print(f"{i}. {rid} 最高第 {info['floor']} 层 {status} 决策 {info['decisions']}")
finished = [v for v in runs.values() if v.get("over") or v.get("win")]
wins = sum(1 for v in runs.values() if v.get("win"))
print(f"完成 {len(finished)} 局，胜 {wins}；过第一幕 boss（≥18 层）{sum(1 for v in runs.values() if v['floor'] >= 18)} 局；到第二幕 boss（≥33 层）{sum(1 for v in runs.values() if v['floor'] >= 33)} 局")

# ---- API requests
jev_calls = sum(1 for r in recs if r["usage"]["input_tokens"] > 0 and not brain_direct(r) and not (r.get("escalation") or {}).get("by") == "deepseek")
def _jev_usage(r):
    """Jev's own tokens of a record. Since 09-28 `usage` also counts DeepSeek's tokens (then it carries
    cache_hit_tokens): all of them on a DeepSeek-decided screen, the escalation's on an escalated one."""
    u = r["usage"]
    if "cache_hit_tokens" not in u:
        return u["input_tokens"], u["output_tokens"]
    if brain_direct(r):
        return 0, 0
    e = r.get("escalation") or {}
    if e.get("by", "deepseek") == "deepseek":
        return u["input_tokens"] - (e.get("input_tokens") or 0), u["output_tokens"] - (e.get("output_tokens") or 0)
    return u["input_tokens"], u["output_tokens"]


jev_calls = sum(1 for r in recs if _jev_usage(r)[0] > 0)
jev_in = sum(_jev_usage(r)[0] for r in recs)
jev_out = sum(_jev_usage(r)[1] for r in recs)
esc = [r for r in recs if r.get("escalation")]
ds = [r for r in esc if r["escalation"].get("by", "deepseek") == "deepseek"]
# Direct DeepSeek decisions (no Jev first): their stats live under r["deepseek"]; fold them in for totals.
def _num(v):
    return v if isinstance(v, (int, float)) else 0


ds_direct = [r for r in recs if not r.get("escalation") and (r.get("deepseek") or brain_direct(r))]
cl = [r for r in esc if r["escalation"].get("by") == "claude"]
print("\n## 接口请求")
print(f"Jev 请求 {jev_calls} 次，token {jev_in:,} 入 / {jev_out:,} 出，约 ${(jev_in + jev_out) / 1e6 * JEV_PRICE:.3f}")
lat = sorted(r["latency_ms"]["jev"] for r in recs if r["latency_ms"]["jev"] > 0)
if lat:
    print(f"Jev 延迟 p50 {lat[len(lat)//2]} ms，p95 {lat[int(len(lat)*0.95)]} ms")
# Direct DeepSeek decisions count too (a memo-reused answer made no call).
ds_calls = [r["escalation"] for r in ds] + [r["deepseek"] for r in ds_direct if isinstance(r.get("deepseek"), dict) and not r["deepseek"].get("reused")]
ds_tokens = sum(_num(c.get("tokens")) for c in ds_calls)
ds_in = sum(_num(c.get("input_tokens")) for c in ds_calls)
ds_hit = sum(_num(c.get("cache_hit_tokens")) for c in ds_calls)
ds_out = sum(_num(c.get("output_tokens")) for c in ds_calls)
ds_reason = sum(_num(c.get("reasoning_tokens")) for c in ds_calls)
ds_cost = ((ds_in - ds_hit) * DS_MISS + ds_hit * DS_HIT + ds_out * DS_OUT) / 1e6
_ds_paid = [r for r in ds_direct if not (isinstance(r.get("deepseek"), dict) and r["deepseek"].get("reused"))]
print(f"DeepSeek 兜底 {len(ds)} 次、直接决策 {len(_ds_paid)} 次（另有 {len(ds_direct) - len(_ds_paid)} 步沿用已有答案或一次性计划），token {ds_tokens:,}（输入 {ds_in:,}，其中缓存命中 {ds_hit:,}；输出 {ds_out:,}，其中思考 {ds_reason:,}），按高峰价约 ${ds_cost:.3f}")
_by_engine = collections.Counter(brain_engine(r) for r in _ds_paid)
if set(_by_engine) - {"deepseek"}:
    # V4.5: the direct decisions above are the brain's, whichever engine answered (the cost line prices them all as DeepSeek).
    print("  直接决策按答题引擎：" + "，".join(f"{k} {v}" for k, v in _by_engine.most_common()))
# DeepSeek's prefix cache: hit tokens / input tokens over the recent runs (decisions, escalations and the
# run/fight plans), when the logs carry the numbers.
RECENT_RUNS = 5
recent = [rid for rid in runs][-RECENT_RUNS:]
cache_rows = [(r["_run"], c) for r, c in [(r, r["escalation"]) for r in ds] + [(r, r["deepseek"]) for r in ds_direct if isinstance(r.get("deepseek"), dict) and not r["deepseek"].get("reused")]]
for name in ("run-plans.jsonl", "fight-plans.jsonl"):
    path = os.path.join(ROOT, "logs", name)
    if os.path.exists(path):
        cache_rows += [(p.get("run"), p) for p in load(path)]
cache_rows = [(rid, c) for rid, c in cache_rows if rid in recent and _num(c.get("input_tokens")) > 0 and "cache_hit_tokens" in c]
if cache_rows:
    c_in = sum(_num(c["input_tokens"]) for _, c in cache_rows)
    c_hit = sum(_num(c["cache_hit_tokens"]) for _, c in cache_rows)
    print(f"DeepSeek 缓存命中率（最近 {len(recent)} 局，{len(cache_rows)} 次调用）: 命中 {c_hit:,} / 输入 {c_in:,} tokens = {c_hit / c_in:.0%}")
ds_lat = sorted([r["escalation"].get("latency_ms", 0) for r in ds] + [_num((r.get("deepseek") or {}).get("latency_ms")) or _num(r.get("latency_ms")) for r in ds_direct if not (isinstance(r.get("deepseek"), dict) and r["deepseek"].get("reused"))])
if ds_lat:
    print(f"DeepSeek 延迟 p50 {ds_lat[len(ds_lat)//2]/1000:.1f} 秒，最长 {ds_lat[-1]/1000:.1f} 秒")
cl_lat = sorted(r["escalation"].get("latency_ms", 0) for r in cl)
print(f"Claude（本 session）兜底 {len(cl)} 次，作答用时中位 {cl_lat[len(cl_lat)//2]/1000 if cl_lat else 0:.0f} 秒")

# ---- deciders
print("\n## 决策者分布（全部对局）")
dc = collections.Counter(decider(r) for r in recs)
total = sum(dc.values())
for k, v in dc.most_common():
    print(f"{k}: {v}（{v/total:.0%}）")

# ---- Jev judgments
jev = [r for r in recs if decider(r) in ("jev",) or r.get("escalation")]
confs = [r["escalation"]["jev_confidence"] if r.get("escalation") else r.get("confidence") for r in jev]
confs = [c for c in confs if isinstance(c, (int, float))]
print("\n## Jev 的判断")
print(f"Jev 作答 {len(confs)} 次（含后来被兜底复核的）")
buckets = collections.Counter("<0.2" if c < 0.2 else "0.2-0.35" if c < 0.35 else "0.35-0.5" if c < 0.5 else "0.5-0.75" if c < 0.75 else ">=0.75" for c in confs)
for b in ("<0.2", "0.2-0.35", "0.35-0.5", "0.5-0.75", ">=0.75"):
    print(f"置信度 {b}: {buckets[b]}")
by_cat = collections.Counter(category(r["label"]) for r in recs if decider(r) == "jev")
print("Jev 最终拍板的决策按类型：" + "，".join(f"{k} {v}" for k, v in by_cat.most_common()))
# plan-choice: how often Jev picked code's rank 1
ranks = collections.Counter()
for r in recs:
    if r["label"].startswith("combat/plan-choice") and decider(r) == "jev":
        m = r["rationale"].split("code rank ")
        if len(m) > 1:
            ranks[m[1].split()[0].strip(";")] += 1
if ranks:
    print("战斗方案题中 Jev 所选方案的代码排名：" + "，".join(f"第{k}名 {v}" for k, v in sorted(ranks.items())))

# ---- escalations
print("\n## 兜底模型复核（Jev 置信度低于阈值时）")
for name, group in (("Claude", cl), ("DeepSeek", ds)):
    agree = sum(1 for r in group if r["escalation"].get("choice", r["escalation"].get("deepseek_choice")) == r["escalation"]["jev_choice"])
    print(f"{name}: 复核 {len(group)} 次，同意 Jev {agree} 次，纠正 {len(group) - agree} 次（纠正率 {((len(group) - agree) / len(group)) if group else 0:.0%}）")
    per = collections.defaultdict(lambda: [0, 0])
    for r in group:
        c = category(r["label"])
        per[c][0] += 1
        if r["escalation"].get("choice", r["escalation"].get("deepseek_choice")) != r["escalation"]["jev_choice"]:
            per[c][1] += 1
    print("  按类型（复核/纠正）：" + "，".join(f"{k} {v[0]}/{v[1]}" for k, v in sorted(per.items(), key=lambda kv: -kv[1][0])))
