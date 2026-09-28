#!/usr/bin/env python3
"""Post-mortem for one jev-sts2 run: outcome, where HP went, who decided what (code / Jev / DeepSeek).

Usage: report.py [run_id]   (default: the last run in logs/decisions.jsonl)
Prints Markdown. Appends a one-line summary to logs/runs.jsonl (idempotent per run id).
"""
import collections
import json
import os
import sys

ROOT = os.path.expanduser("~/Projects/sts2-jev/jev-sts2")
DEC = os.path.join(ROOT, "logs/decisions.jsonl")
STATES = os.path.join(ROOT, "logs/states.jsonl")
RUNS = os.path.join(ROOT, "logs/runs.jsonl")
PRICE_PER_M = 0.042  # $ per million tokens (in + out), handoff estimate


def load(path):
    if not os.path.exists(path):
        return []
    out = []
    for line in open(path, encoding="utf8"):
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def run_of(record):
    try:
        return json.loads(record["fingerprint"]).get("run") or None
    except Exception:
        return None


def decider(record):
    rationale = record.get("rationale", "")
    if record.get("label") == "combat/plan-continue":
        if "Jev-chosen" in rationale:
            return "jev-plan"
        if "DeepSeek-chosen" in rationale:
            return "deepseek-plan"
        if "Claude-chosen" in rationale:
            return "claude-plan"
    if record.get("decider"):
        return record["decider"]
    # Older records: infer.
    if record.get("questions"):
        return "code-fallback" if record.get("fallback") else "jev"
    return "code"


def main():
    decisions = [r for r in load(DEC) if r.get("mode") == "play"]
    runs = [run_of(r) for r in decisions]
    run_id = sys.argv[1] if len(sys.argv) > 1 else next((r for r in reversed(runs) if r), None)
    if not run_id:
        print("no run found")
        return
    recs = [r for r in decisions if run_of(r) == run_id]
    # The GAME_OVER record has no run in its fingerprint: attach the one right after the last record.
    last_ts = recs[-1]["ts"] if recs else ""
    tail = [r for r in decisions if r["ts"] > last_ts and r.get("screen") == "GAME_OVER"][:1]
    # Stream: states.jsonl is hundreds of MB. Every line starts with {"ts":"<24-char ISO ts>", so only
    # the lines this report looks up are parsed.
    wanted = {r["ts"] for r in tail + recs}
    states = {}
    with open(STATES, encoding="utf8") as handle:
        for line in handle:
            if line[7:31] not in wanted:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            states[entry["ts"]] = entry["state"]

    floors = [r["floor"] for r in recs if r.get("floor") is not None]
    top_floor = max(floors) if floors else None
    game_over = None
    for r in tail + recs:
        st = states.get(r["ts"])
        if st and st.get("game_over"):
            game_over = st["game_over"]
    victory = bool(game_over and game_over.get("is_victory"))
    ended = bool(tail) or any(r.get("screen") == "GAME_OVER" for r in recs)
    if not ended and recs:
        # A win can end on the post-boss event with no GAME_OVER record (CRRPX9MWJZGM): the play
        # loop's console log still says "run 1 ended (victory)".
        import glob
        import datetime as _dt
        last = _dt.datetime.fromisoformat(recs[-1]["ts"].replace("Z", "+00:00")).timestamp()
        for path in glob.glob(os.path.join(ROOT, "logs/console/*.log")):
            if 0 <= os.path.getmtime(path) - last < 300:
                if "ended (victory)" in open(path, encoding="utf8", errors="replace").read():
                    victory = ended = True
                    break

    by_decider = collections.Counter(decider(r) for r in recs)
    by_label_decider = collections.Counter((r["label"], decider(r)) for r in recs)
    tokens_in = sum(r["usage"]["input_tokens"] for r in recs)
    tokens_out = sum(r["usage"]["output_tokens"] for r in recs)
    jev_calls = sum(1 for r in recs if r["usage"]["input_tokens"] > 0 and decider(r) != "deepseek")
    # Escalations to DeepSeek plus its direct decisions (build/route/rest decider since 2026-09-28).
    ds_calls = sum(1 for r in recs if (r.get("escalation") and r["escalation"].get("by", "deepseek") == "deepseek") or r.get("deepseek") or r.get("decider") == "deepseek")
    cl_calls = sum(1 for r in recs if r.get("escalation") and r["escalation"].get("by") == "claude")
    elapsed = 0
    if recs:
        from datetime import datetime
        t0 = datetime.fromisoformat(recs[0]["ts"].replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(recs[-1]["ts"].replace("Z", "+00:00"))
        elapsed = (t1 - t0).total_seconds()

    # HP per floor (from fingerprints), and fights: consecutive COMBAT records on one floor.
    hp_by_floor = collections.OrderedDict()
    for r in recs:
        try:
            hp = json.loads(r["fingerprint"]).get("hp")
        except Exception:
            hp = None
        if r.get("floor") is not None and hp is not None:
            hp_by_floor.setdefault(r["floor"], [hp, hp])
            hp_by_floor[r["floor"]][1] = hp

    fights = []
    current = None
    for r in recs:
        if r["screen"] != "COMBAT":
            if current:
                fights.append(current)
                current = None
            continue
        st = states.get(r["ts"]) or {}
        combat = st.get("combat") or {}
        enemies = [e.get("name") or e.get("enemy_id") for e in combat.get("enemies", []) if e.get("is_alive", True)]
        hp = (combat.get("player") or {}).get("current_hp")
        if current is None or current["floor"] != r["floor"]:
            if current:
                fights.append(current)
            current = {"floor": r["floor"], "enemies": set(), "hp_start": hp, "hp_end": hp, "records": []}
        current["enemies"].update(enemies)
        if hp is not None:
            current["hp_end"] = hp
        current["records"].append(r)
    if current:
        fights.append(current)

    out = []
    title = "胜利" if victory else ("阵亡" if ended else "未结束")
    out.append(f"## 复盘：run {run_id} — {title}，最高第 {top_floor} 层")
    out.append("")
    out.append(f"- 决策 {len(recs)} 个；Jev 调用 {jev_calls} 次，Claude {cl_calls} 次，DeepSeek {ds_calls} 次；token {tokens_in:,} 入 / {tokens_out:,} 出，约 ${(tokens_in + tokens_out) / 1e6 * PRICE_PER_M:.4f}；用时 {elapsed/60:.1f} 分钟")
    out.append(f"- 决策者：" + "，".join(f"{k} {v}" for k, v in by_decider.most_common()))
    out.append("")
    out.append("### 战斗掉血（按层）")
    for f in fights:
        loss = (f["hp_start"] or 0) - (f["hp_end"] or 0)
        who = collections.Counter(decider(r) for r in f["records"])
        out.append(f"- 第 {f['floor']} 层 {'/'.join(sorted(x for x in f['enemies'] if x))}: HP {f['hp_start']}→{f['hp_end']}（{'-' if loss >= 0 else '+'}{abs(loss)}），决策 " + "，".join(f"{k} {v}" for k, v in who.most_common()))
    out.append("")
    if fights and not victory and ended:
        last = fights[-1]
        out.append(f"### 死亡战斗：第 {last['floor']} 层 {'/'.join(sorted(x for x in last['enemies'] if x))}")
        for r in last["records"][-12:]:
            conf = f" conf {r['confidence']:.2f}" if isinstance(r.get("confidence"), (int, float)) else ""
            out.append(f"- T{r.get('turn')} [{decider(r)}] {r['label']}: {r['rationale'][:160]}{conf}")
        out.append("")
    out.append("### 各类决策由谁做")
    for (label, who), n in sorted(by_label_decider.items(), key=lambda kv: (-kv[1], kv[0])):
        out.append(f"- {label} / {who}: {n}")
    esc = [r for r in recs if r.get("escalation")]
    out.append("")
    out.append(f"### 兜底介入（Claude/DeepSeek）：{len(esc)} 次（推翻 Jev {sum(1 for r in esc if r['escalation'].get('deepseek_choice') != r['escalation'].get('jev_choice'))} 次）")
    for r in esc[:20]:
        e = r["escalation"]
        verdict = "同意" if e.get("deepseek_choice") == e.get("jev_choice") else "推翻"
        out.append(f"- [{e.get('by', 'deepseek')}] 第 {r.get('floor')} 层 T{r.get('turn')} {r['label']}: {verdict} Jev（{e.get('jev_choice')} @{e.get('jev_confidence', 0):.2f} → {e.get('deepseek_choice')}）：{e.get('reason', '')[:120]}")
    low = [r for r in recs if decider(r) == "jev" and isinstance(r.get("confidence"), (int, float)) and r["confidence"] < 0.35]
    out.append("")
    out.append(f"### Jev 低置信度（<0.35）决策：{len(low)} 个")
    for r in low[:15]:
        out.append(f"- 第 {r.get('floor')} 层 {r['label']}: {r['rationale'][:150]} ({r['confidence']:.2f})")
    print("\n".join(out))

    # Append to the run index once.
    existing = {r.get("run_id") for r in load(RUNS)}
    if ended and run_id not in existing:
        sha = ""
        consoles = sorted(os.listdir(os.path.join(ROOT, "logs/console"))) if os.path.isdir(os.path.join(ROOT, "logs/console")) else []
        if consoles:
            sha = consoles[-1].rsplit("-", 1)[-1].removesuffix(".log")
        character = None
        ascension = None
        for r in recs:
            st = states.get(r["ts"])
            if st and st.get("run"):
                character = st["run"].get("character_id")
                ascension = st["run"].get("ascension")
                break
        with open(RUNS, "a", encoding="utf8") as handle:
            handle.write(json.dumps({
                "run_id": run_id, "ended": recs[-1]["ts"], "victory": victory, "floor": top_floor,
                "character": character, "ascension": ascension, "code": sha, "decisions": len(recs),
                "jev_calls": jev_calls, "deepseek_calls": ds_calls, "claude_calls": cl_calls, "tokens": tokens_in + tokens_out,
                "deciders": dict(by_decider),
                "death_fight": None if victory or not fights else sorted(x for x in fights[-1]["enemies"] if x),
                **ablation_arm(),
            }, ensure_ascii=False) + "\n")


def ablation_arm():
    """The ablation arm this run played under (ops/ablation-current.json, set by ops/run.sh), then
    advance the schedule. {} when no ablation is running."""
    ops = os.path.join(os.path.dirname(ROOT), "ops")
    cur_path = os.path.join(ops, "ablation-current.json")
    sched_path = os.path.join(ops, "ablation.json")
    try:
        cur = json.load(open(cur_path))
    except (OSError, json.JSONDecodeError):
        return {}
    if cur.get("done"):
        return {}
    cur["done"] = True
    json.dump(cur, open(cur_path, "w"))
    try:
        sched = json.load(open(sched_path))
        sched["i"] = int(sched.get("i", 0)) + 1
        json.dump(sched, open(sched_path, "w"))
    except (OSError, json.JSONDecodeError):
        pass
    return {"arm": cur.get("arm")}


def refresh_knowledge() -> None:
    """After each run: monster DB, per-fight move model, outcome stats (background; never blocks the next run)."""
    import subprocess
    tools = os.path.expanduser("~/Projects/sts2-jev/jev-sts2/tools")
    mm = os.path.expanduser("~/Projects/sts2-jev/jev-sts2/src/knowledge/move-model.json")
    cmd = (f'python3 {tools}/build-monster-db.py --quiet --move-model-out {mm}; '
           f'python3 {tools}/monster-db-check.py >/dev/null 2>&1; '
           f'python3 {tools}/build-outcome-stats.py >/dev/null 2>&1; '
           f'python3 {tools}/build-room-costs.py >/dev/null 2>&1; '
           f'nice -n 10 python3 {tools}/build-fight-value.py all >/dev/null 2>&1')
    log = open(os.path.expanduser("~/Projects/sts2-jev/ops/refresh.log"), "a")
    subprocess.Popen(["bash", "-c", cmd], stdout=log, stderr=log, start_new_session=True)


if __name__ == "__main__":
    main()
    try:
        refresh_knowledge()
    except Exception:
        pass
